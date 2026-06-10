import { ClientLayout, ClientPageContainer } from '../../../../components/client-layout';
import { QuizManagement } from '../quiz-management';
import './InstructorAssessmentsPage.css';

export function InstructorAssessmentsPage() {
  return (
    <ClientLayout>
      <ClientPageContainer
        title="Assessments"
        subtitle="Create assignments, build quizzes, manage questions, and review student submissions."
      >
        <section className="instructor-assessments-page">
          <QuizManagement />
        </section>
      </ClientPageContainer>
    </ClientLayout>
  );
}

