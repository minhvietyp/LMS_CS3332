import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Input, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeft, Paperclip, Upload } from 'lucide-react';
import { useMemo, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import {
  getStudentAssignmentDetailRequest,
  submitStudentAssignmentRequest,
  uploadAssignmentSubmissionFileRequest,
  type AssignmentSubmissionPayload,
} from '../services/assignmentApi';
import './ClientAssignmentPages.css';

const { TextArea } = Input;

function getSubmissionStatusPresentation(submission: { status: string; isLate: boolean; grade?: number | null }) {
  if (submission.status === 'RETURNED') {
    return { label: 'Returned', color: 'purple' as const };
  }

  if (submission.status === 'GRADED') {
    return { label: submission.grade != null ? `Graded ${submission.grade}%` : 'Graded', color: 'blue' as const };
  }

  if (submission.status === 'LATE') {
    return { label: 'Late', color: 'volcano' as const };
  }

  return { label: 'On time', color: submission.isLate ? 'volcano' as const : 'green' as const };
}

export function ClientAssignmentSubmissionPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [textContent, setTextContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileUrl, setSelectedFileUrl] = useState<string | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const assignmentQuery = useQuery({
    queryKey: ['assignments', 'student-detail', assignmentId],
    queryFn: () => getStudentAssignmentDetailRequest(assignmentId!),
    enabled: Boolean(assignmentId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  const latestSubmission = assignmentQuery.data?.submissions[0] ?? null;
  const statusPresentation = latestSubmission ? getSubmissionStatusPresentation(latestSubmission) : null;
  const isClosed = useMemo(() => {
    if (!assignmentQuery.data?.dueDate) {
      return false;
    }

    const dueDate = new Date(assignmentQuery.data.dueDate);
    return dueDate < new Date() && !assignmentQuery.data.allowLateSubmission;
  }, [assignmentQuery.data]);

  const submitMutation = useMutation({
    mutationFn: (payload: AssignmentSubmissionPayload) => submitStudentAssignmentRequest(assignmentId!, payload),
    onSuccess: () => {
      void assignmentQuery.refetch();
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
    if (!file) {
      return;
    }

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

  return (
    <ClientLayout>
      <ClientPageContainer
        title={assignmentQuery.data?.title ?? 'Assignment workspace'}
        subtitle="Submit a text response, attach one file, or combine both. Resubmitting replaces the previous submission."
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      >
        {assignmentQuery.isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}
        {assignmentQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load assignment"
            description={assignmentQuery.error instanceof Error ? assignmentQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!assignmentQuery.isLoading && !assignmentQuery.data ? <Empty description="Assignment not found." /> : null}

        {assignmentQuery.data ? (
          <div className="client-assignment-layout">
            <Card className="client-assignment-panel">
              <Space direction="vertical" size={20} style={{ width: '100%' }}>
                <div className="client-assignment-card__header">
                  <div>
                    <Typography.Title level={4}>{assignmentQuery.data.title}</Typography.Title>
                    <Typography.Paragraph type="secondary">
                      {assignmentQuery.data.description || 'No assignment description provided.'}
                    </Typography.Paragraph>
                  </div>
                  <Tag color={isClosed ? 'red' : assignmentQuery.data.allowLateSubmission ? 'orange' : 'green'}>
                    {isClosed ? 'Closed' : assignmentQuery.data.allowLateSubmission ? 'Late allowed' : 'On-time only'}
                  </Tag>
                </div>

                <div className="client-assignment-card__meta">
                  <Tag color={assignmentQuery.data.dueDate ? 'gold' : 'default'}>
                    {assignmentQuery.data.dueDate
                      ? `Due ${new Date(assignmentQuery.data.dueDate).toLocaleString()}`
                      : 'No due date'}
                  </Tag>
                  {latestSubmission ? (
                    <Tag color={statusPresentation?.color}>
                      {statusPresentation?.label}
                    </Tag>
                  ) : null}
                </div>

                {isClosed ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Submission window closed"
                    description="The due date has passed and late submissions are not allowed for this assignment."
                  />
                ) : null}
                {latestSubmission?.status === 'RETURNED' ? (
                  <Alert
                    type="success"
                    showIcon
                    message="Feedback returned"
                    description="Your instructor has returned this submission with a final grade and feedback."
                  />
                ) : latestSubmission?.status === 'GRADED' ? (
                  <Alert
                    type="info"
                    showIcon
                    message="Submission graded"
                    description="Your instructor has graded this submission. Review the score and comments in the result panel."
                  />
                ) : null}
                {submissionError ? <Alert type="error" showIcon message={submissionError} /> : null}

                <div>
                  <Typography.Text strong>Response</Typography.Text>
                  <TextArea
                    value={textContent}
                    onChange={(event) => setTextContent(event.target.value)}
                    rows={8}
                    placeholder="Write your answer, reflection, or project notes here."
                    style={{ marginTop: 8 }}
                  />
                </div>

                <div>
                  <Typography.Text strong>Attachment</Typography.Text>
                  <label className="client-assignment-upload" htmlFor="assignment-file">
                    <Upload size={18} />
                    <span>
                      {isUploadingFile
                        ? 'Uploading file...'
                        : selectedFileName
                          ? `Uploaded: ${selectedFileName}`
                          : 'Choose one file to attach'}
                    </span>
                  </label>
                  <input
                    id="assignment-file"
                    type="file"
                    onChange={handleFileChange}
                    className="client-assignment-upload__input"
                    disabled={isUploadingFile}
                  />
                  {selectedFileName ? (
                    <Button type="link" onClick={() => {
                      setSelectedFileName(null);
                      setSelectedFileUrl(null);
                    }}>
                      Remove selected file
                    </Button>
                  ) : null}
                </div>

                <div className="client-assignment-card__actions">
                  <Button type="primary" onClick={handleSubmit} disabled={!canSubmit} loading={submitMutation.isPending}>
                    {latestSubmission ? 'Resubmit assignment' : 'Submit assignment'}
                  </Button>
                </div>
              </Space>
            </Card>

            <Card className="client-assignment-sidebar">
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Current submission
                </Typography.Title>
                {!latestSubmission ? (
                  <Empty description="No submission yet." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div className="client-assignment-history">
                    <div className="client-assignment-history__item">
                      <Space direction="vertical" size={8} style={{ width: '100%' }}>
                        <Typography.Text strong>Submission result</Typography.Text>
                        <Space wrap>
                          <Tag color={statusPresentation?.color}>{statusPresentation?.label}</Tag>
                          <Tag>{latestSubmission.isLate ? 'Submitted late' : 'Submitted on time'}</Tag>
                        </Space>
                        <Typography.Text type="secondary">
                          Submitted {new Date(latestSubmission.submittedAt).toLocaleString()}
                        </Typography.Text>
                        {latestSubmission.grade != null ? (
                          <Typography.Text strong>Grade: {latestSubmission.grade}%</Typography.Text>
                        ) : null}
                        {latestSubmission.feedback ? (
                          <Typography.Paragraph style={{ marginBottom: 0 }}>
                            Feedback: {latestSubmission.feedback}
                          </Typography.Paragraph>
                        ) : null}
                        {latestSubmission.textContent ? (
                          <Typography.Paragraph style={{ marginBottom: 0 }}>
                            {latestSubmission.textContent}
                          </Typography.Paragraph>
                        ) : null}
                        {latestSubmission.fileName ? (
                          <a href={latestSubmission.fileUrl ?? '#'} target="_blank" rel="noreferrer" className="client-assignment-file-link">
                            <Paperclip size={14} />
                            <span>{latestSubmission.fileName}</span>
                          </a>
                        ) : null}
                      </Space>
                    </div>
                  </div>
                )}
              </Space>
            </Card>
          </div>
        ) : null}
      </ClientPageContainer>
    </ClientLayout>
  );
}
