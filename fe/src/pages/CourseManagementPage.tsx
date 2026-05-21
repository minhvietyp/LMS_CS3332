import { AdminPageContainer } from '../components/admin/layout';
import { CourseManagement } from '../components/admin/courses';

export function CourseManagementPage() {
  return (
    <AdminPageContainer
      title="Course Management"
      subtitle="Create, review, publish, archive, and maintain LMS course records from one admin workspace."
    >
      <CourseManagement />
    </AdminPageContainer>
  );
}
