import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstructorDetailPage } from '../../../pages/public/InstructorDetailPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

const getPublicInstructorByIdRequest = vi.fn();

vi.mock('../../../services/api/authApi', () => ({
  getPublicInstructorByIdRequest: (...args: unknown[]) => getPublicInstructorByIdRequest(...args),
}));

describe('InstructorDetailPage', () => {
  afterEach(() => vi.clearAllMocks());

  beforeEach(() => {
    getPublicInstructorByIdRequest.mockResolvedValue({
      id: 'instructor-1',
      name: 'Dr. Ada',
      email: 'ada@example.com',
      role: 'INSTRUCTOR',
      occupation: 'Frontend Instructor',
      bio: 'Teaches frontend architecture.',
      courseCount: 2,
      studentCount: 120,
      publishedCourses: [
        {
          id: 'course-1',
          title: 'Frontend Foundations',
          description: 'Master the fundamentals.',
          status: 'PUBLISHED',
          instructorId: 'instructor-1',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          moduleCount: 2,
          lessonCount: 6,
          enrollmentCount: 120,
        },
      ],
    });
  });

  it('renders instructor profile and published courses', async () => {
    renderPublicPage(
      <Routes>
        <Route path="/instructors/:instructorId" element={<InstructorDetailPage />} />
      </Routes>,
      '/instructors/instructor-1',
    );

    expect(await screen.findByRole('heading', { name: 'Dr. Ada' })).toBeInTheDocument();
    expect(screen.getByText('Published courses')).toBeInTheDocument();
    expect(screen.getByText('Frontend Foundations')).toBeInTheDocument();
  });
});
