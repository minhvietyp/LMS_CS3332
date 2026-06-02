import { Navigate, useParams } from 'react-router-dom';
import { AdminPageContainer } from '../../../components/admin-layout';
import { CourseManagementDetail } from './components';

export function AdminCourseDetailPage() {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/admin/courses" replace />;
  }

  return (
    <AdminPageContainer
      title="Course Detail"
      subtitle="Review course metadata, ownership, publishing state, and the full lesson structure."
    >
      <CourseManagementDetail courseId={id} />
    </AdminPageContainer>
  );
}

