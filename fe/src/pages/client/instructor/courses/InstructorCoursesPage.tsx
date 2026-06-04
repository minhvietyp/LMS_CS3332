import { Card, Typography } from 'antd';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { CourseManagement } from '../../../admin/courses/components';
import '../InstructorWorkspacePage.css';

export function InstructorCoursesPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="Courses"
        subtitle="Create, publish, archive, and maintain the courses you teach from your instructor workspace."
      >
        <section className="instructor-workspace">
          <div className="instructor-workspace-summary">
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Course table</Typography.Text>
              <Typography.Text strong>Search, filter, publish, archive, and open course details.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Course forms</Typography.Text>
              <Typography.Text strong>Create or edit course title, description, and thumbnail.</Typography.Text>
            </Card>
            <Card className="instructor-workspace-card">
              <Typography.Text className="instructor-workspace-card__label">Related work</Typography.Text>
              <Typography.Text strong>Use lessons and assessments pages for course content.</Typography.Text>
            </Card>
          </div>
          <div className="instructor-workspace__embedded">
            <CourseManagement basePath="/instructor/courses" />
          </div>
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}

