import { Navigate, useParams } from 'react-router-dom';
import { AdminPageContainer } from '../../../components/admin-layout';
import { CourseManagementForm } from './components';

export function AdminCourseEditPage() {
  const { id } = useParams();

  if (!id) {
    return <Navigate to="/admin/courses" replace />;
  }

  return (
    <AdminPageContainer
      title="Edit Course"
      subtitle="Update the core course metadata that appears in the admin catalog and detail view."
    >
      <CourseManagementForm mode="edit" courseId={id} />
    </AdminPageContainer>
  );
}

