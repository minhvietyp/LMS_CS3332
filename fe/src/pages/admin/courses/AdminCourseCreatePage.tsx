import { AdminPageContainer } from '../../../components/admin/layout';
import { CourseManagementForm } from '../../../components/admin/courses';

export function AdminCourseCreatePage() {
  return (
    <AdminPageContainer
      title="Create Course"
      subtitle="Add a new course record, define its learning summary, and prepare it for lesson planning."
    >
      <CourseManagementForm mode="create" />
    </AdminPageContainer>
  );
}
