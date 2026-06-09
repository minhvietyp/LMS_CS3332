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
              <Typography.Text strong>Organize due-date work, submission reviews, and return-ready grading from one place.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Quizzes</Typography.Text>
              <Typography.Text strong>Build question banks, publish checks, and inspect learner attempts without leaving the workspace.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Grading</Typography.Text>
              <Typography.Text strong>Open submissions, assign scores, and return feedback with fewer table jumps.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Analytics</Typography.Text>
              <Typography.Text strong>Track pass rates, missing work, and publishing pressure with compact teaching widgets.</Typography.Text>
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

