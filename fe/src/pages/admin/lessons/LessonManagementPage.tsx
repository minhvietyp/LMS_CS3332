import { AdminPageContainer } from '../../../components/admin-layout';
import { LessonManagement } from './components';

export function LessonManagementPage() {
  return (
    <AdminPageContainer
      title="Create and manage lessons"
      subtitle="Pick a course, organize modules, and manage lesson content in one place."
    >
      <LessonManagement />
    </AdminPageContainer>
  );
}

