import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Empty, Skeleton, Space, Tag, Typography } from 'antd';
import { ArrowLeft, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClientLayout, ClientPageContainer } from '../components/client/layout';
import { listStudentCourseAssignmentsRequest } from '../services/assignmentApi';
import './ClientAssignmentPages.css';

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

export function ClientCourseAssignmentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const assignmentsQuery = useQuery({
    queryKey: ['assignments', 'student-course', courseId],
    queryFn: () => listStudentCourseAssignmentsRequest(courseId!),
    enabled: Boolean(courseId),
    staleTime: 60 * 1000,
    retry: 1,
  });

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Course Assignments"
        subtitle="Review assignment deadlines, submission status, and attach text or files when you are ready."
        actions={
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Back
          </Button>
        }
      >
        {assignmentsQuery.isLoading ? <Skeleton active paragraph={{ rows: 6 }} /> : null}
        {assignmentsQuery.error ? (
          <Alert
            type="error"
            showIcon
            message="Failed to load assignments"
            description={assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : 'Unexpected error'}
          />
        ) : null}
        {!assignmentsQuery.isLoading && !assignmentsQuery.data?.length ? (
          <Empty description="No assignments are available for this course yet." />
        ) : null}

        <div className="client-assignment-grid">
          {assignmentsQuery.data?.map((assignment) => {
            const latestSubmission = assignment.submissions[0] ?? null;
            const statusPresentation = latestSubmission ? getSubmissionStatusPresentation(latestSubmission) : null;

            return (
              <Card key={assignment.id} className="client-assignment-card">
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div className="client-assignment-card__header">
                    <div>
                      <Typography.Title level={4}>{assignment.title}</Typography.Title>
                      <Typography.Paragraph type="secondary">
                        {assignment.description || 'No assignment description provided.'}
                      </Typography.Paragraph>
                    </div>
                    <Tag color={statusPresentation?.color ?? 'blue'}>
                      {statusPresentation?.label ?? 'Awaiting submission'}
                    </Tag>
                  </div>

                  <div className="client-assignment-card__meta">
                    <Tag color={assignment.dueDate ? 'gold' : 'default'}>
                      {assignment.dueDate ? `Due ${new Date(assignment.dueDate).toLocaleString()}` : 'No due date'}
                    </Tag>
                    <Tag color={assignment.allowLateSubmission ? 'orange' : 'red'}>
                      {assignment.allowLateSubmission ? 'Late allowed' : 'Late blocked'}
                    </Tag>
                    {latestSubmission ? (
                      <Tag color={latestSubmission.isLate ? 'volcano' : 'green'}>
                        {latestSubmission.isLate ? 'Late submission' : 'On-time submission'}
                      </Tag>
                    ) : null}
                  </div>

                  {latestSubmission ? (
                    <Typography.Text type="secondary">
                      Latest submission: {latestSubmission.fileName || latestSubmission.textContent || statusPresentation?.label}
                    </Typography.Text>
                  ) : (
                    <Typography.Text type="secondary">
                      Submit text, a file, or both from the assignment workspace.
                    </Typography.Text>
                  )}

                  <div className="client-assignment-card__actions">
                    <Button
                      type="primary"
                      icon={<FileText size={16} />}
                      onClick={() => navigate(`/courses/${courseId}/assignments/${assignment.id}`)}
                    >
                      {latestSubmission ? 'Review or resubmit' : 'Open assignment'}
                    </Button>
                  </div>
                </Space>
              </Card>
            );
          })}
        </div>
      </ClientPageContainer>
    </ClientLayout>
  );
}
