import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicCourseDetailPage } from '../../../pages/public/PublicCourseDetailPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

const getPublicCourseByIdRequest = vi.fn();

vi.mock('../../../services/api/courseApi', () => ({
  getPublicCourseByIdRequest: (...args: unknown[]) => getPublicCourseByIdRequest(...args),
}));

describe('PublicCourseDetailPage', () => {
  afterEach(() => vi.clearAllMocks());

  beforeEach(() => {
    getPublicCourseByIdRequest.mockResolvedValue({
      id: 'course-1',
      title: 'Frontend Foundations',
      description: 'Master the fundamentals of modern frontend engineering.',
      status: 'PUBLISHED',
      instructorId: 'instructor-1',
      instructor: {
        id: 'instructor-1',
        name: 'Dr. Ada',
        bio: 'Teaches frontend architecture.',
      },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      moduleCount: 2,
      lessonCount: 6,
      enrollmentCount: 120,
      modules: [
        {
          id: 'module-1',
          title: 'React basics',
          orderIndex: 1,
          lessons: [{ id: 'lesson-1', title: 'Components', orderIndex: 1, isPublished: true }],
        },
      ],
    });
  });

  it('renders course curriculum and instructor summary', async () => {
    renderPublicPage(
      <Routes>
        <Route path="/catalog/:courseId" element={<PublicCourseDetailPage />} />
      </Routes>,
      '/catalog/course-1',
    );

    await waitFor(() => {
      expect(getPublicCourseByIdRequest).toHaveBeenCalledWith('course-1');
    });
    expect(await screen.findByRole('heading', { name: 'Frontend Foundations' })).toBeInTheDocument();
    expect(screen.getByText('Modules and lessons')).toBeInTheDocument();
    expect(screen.getByText('React basics')).toBeInTheDocument();
    expect(screen.getByText(/Lesson 1:\s*Components/)).toBeInTheDocument();
    expect(screen.getByText('Dr. Ada')).toBeInTheDocument();
  });
});
