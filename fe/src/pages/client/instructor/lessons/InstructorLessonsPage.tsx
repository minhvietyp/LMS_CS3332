import { Card, Typography } from 'antd';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { LessonManagement } from '../../../admin/lessons/components';
import '../InstructorWorkspacePage.css';

export function InstructorLessonsPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="Lessons and modules"
        subtitle="Organize modules, lessons, and materials without leaving the instructor experience."
      >
        <section className="instructor-workspace">
          <div className="instructor-workspace-summary">
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Course context</Typography.Text>
              <Typography.Text strong>Select a course before creating modules or lessons.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Module table</Typography.Text>
              <Typography.Text strong>Review module order, edit titles, or remove unused modules.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Lesson table</Typography.Text>
              <Typography.Text strong>Create lessons, manage order, and attach materials.</Typography.Text>
            </Card>
          </div>
          <div className="instructor-workspace__embedded">
            <LessonManagement />
          </div>
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}

