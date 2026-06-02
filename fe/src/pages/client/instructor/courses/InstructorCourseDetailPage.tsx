import { Navigate, useParams } from 'react-router-dom';
import { CourseManagementDetail } from '../../../admin/courses/components';
import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';

export function InstructorCourseDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/instructor/courses" replace />;
  }

  return (
    <ClientLayout>
      <ClientPageContainer
        title="Course Detail"
        subtitle="Review your course structure, publishing state, and metadata in one place."
      >
        <CourseManagementDetail courseId={id} basePath="/instructor/courses" />
      </ClientPageContainer>
    </ClientLayout>
  );
}

