import { Card, Typography } from 'antd';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { QuizManagement } from '../quiz-management';
import '../InstructorWorkspacePage.css';

export function InstructorAssessmentsPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="Assignments and quizzes"
        subtitle="Create assignments, build quizzes, review submissions, and grade student work from one practical workspace."
      >
        <section className="instructor-workspace">
          <div className="instructor-workspace-summary">
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Assignments</Typography.Text>
              <Typography.Text strong>Create due-date work and review student submissions.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Quizzes</Typography.Text>
              <Typography.Text strong>Build questions, publish quizzes, and inspect attempts.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Grading</Typography.Text>
              <Typography.Text strong>Open submissions, assign scores, and return feedback.</Typography.Text>
            </Card>
          </div>
          <div className="instructor-workspace__embedded">
            <QuizManagement />
          </div>
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}

