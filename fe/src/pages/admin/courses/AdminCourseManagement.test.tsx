import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../../../components/context/AuthContext';
import { CourseManagementPage } from '../../CourseManagementPage';
import { AdminCourseCreatePage } from './AdminCourseCreatePage';
import { AdminCourseDetailPage } from './AdminCourseDetailPage';
import { AdminCourseEditPage } from './AdminCourseEditPage';
import {
  archiveCourseRequest,
  deleteCourseRequest,
  createCourseRequest,
  getCourseByIdRequest,
  listCoursesRequest,
  publishCourseRequest,
  restoreCourseRequest,
  updateCourseRequest,
  updateCourseThumbnailRequest,
} from '../../../services/courseApi';

vi.mock('../../../services/courseApi', async () => {
  const actual = await vi.importActual<typeof import('../../../services/courseApi')>('../../../services/courseApi');

  return {
    ...actual,
    listCoursesRequest: vi.fn(),
    getCourseByIdRequest: vi.fn(),
    createCourseRequest: vi.fn(),
    updateCourseRequest: vi.fn(),
    updateCourseThumbnailRequest: vi.fn(),
    publishCourseRequest: vi.fn(),
    archiveCourseRequest: vi.fn(),
    deleteCourseRequest: vi.fn(),
    restoreCourseRequest: vi.fn(),
  };
});

const listCoursesRequestMock = vi.mocked(listCoursesRequest);
const getCourseByIdRequestMock = vi.mocked(getCourseByIdRequest);
const deleteCourseRequestMock = vi.mocked(deleteCourseRequest);
const createCourseRequestMock = vi.mocked(createCourseRequest);
const updateCourseRequestMock = vi.mocked(updateCourseRequest);
const updateCourseThumbnailRequestMock = vi.mocked(updateCourseThumbnailRequest);
const publishCourseRequestMock = vi.mocked(publishCourseRequest);
const archiveCourseRequestMock = vi.mocked(archiveCourseRequest);
const restoreCourseRequestMock = vi.mocked(restoreCourseRequest);

function buildToken() {
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 * 60 }));
  return `header.${payload}.signature`;
}

function renderWithAdmin(initialEntry: string) {
  localStorage.setItem(
    'lms.auth',
    JSON.stringify({
      user: {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'ADMIN',
        avatarUrl: null,
      },
      token: buildToken(),
      refreshToken: 'refresh-token',
    }),
  );

  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <Routes>
          <Route path="/admin/courses" element={<CourseManagementPage />} />
          <Route path="/admin/courses/create" element={<AdminCourseCreatePage />} />
          <Route path="/admin/courses/:id" element={<AdminCourseDetailPage />} />
          <Route path="/admin/courses/:id/edit" element={<AdminCourseEditPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Admin course management pages', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    localStorage.clear();
    listCoursesRequestMock.mockReset();
    getCourseByIdRequestMock.mockReset();
    deleteCourseRequestMock.mockReset();
    createCourseRequestMock.mockReset();
    updateCourseRequestMock.mockReset();
    updateCourseThumbnailRequestMock.mockReset();
    publishCourseRequestMock.mockReset();
    archiveCourseRequestMock.mockReset();
    restoreCourseRequestMock.mockReset();
  });

  it('loads the course list with query params and updates search', async () => {
    listCoursesRequestMock.mockResolvedValue({
      data: [
        {
          id: 'course-1',
          title: 'React Foundations',
          description: 'Build reliable admin workflows.',
          thumbnailUrl: null,
          status: 'PUBLISHED',
          instructorId: 'admin-1',
          instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          deletedAt: null,
        },
      ],
      meta: {
        page: 2,
        limit: 20,
        total: 21,
        totalPages: 2,
      },
    });

    renderWithAdmin('/admin/courses?page=2&limit=20&status=PUBLISHED');

    await waitFor(() => {
      expect(listCoursesRequestMock).toHaveBeenCalledWith({
        deletedOnly: false,
        includeDeleted: false,
        page: 2,
        limit: 20,
        search: undefined,
        status: 'PUBLISHED',
      });
    });

    fireEvent.change(screen.getByPlaceholderText('Search courses...'), {
      target: { value: 'react' },
    });

    await waitFor(() => {
      expect(listCoursesRequestMock).toHaveBeenLastCalledWith({
        deletedOnly: false,
        includeDeleted: false,
        page: 1,
        limit: 20,
        search: 'react',
        status: 'PUBLISHED',
      });
    });
  });

  it('creates a course from the dedicated create page', async () => {
    createCourseRequestMock.mockResolvedValue({
      id: 'course-99',
      title: 'New Course',
      description: 'A new course.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      deletedAt: null,
    });

    renderWithAdmin('/admin/courses/create');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Course' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'A new course.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create course' }));

    await waitFor(() => {
      expect(createCourseRequestMock).toHaveBeenCalledWith({
        title: 'New Course',
        description: 'A new course.',
      });
    });
  });

  it('loads the course detail page with modules and lessons', async () => {
    getCourseByIdRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      modules: [
        {
          id: 'module-1',
          title: 'Getting Started',
          orderIndex: 1,
          lessons: [
            {
              id: 'lesson-1',
              title: 'Introduction',
              orderIndex: 1,
              videoUrl: null,
              isPublished: true,
              deletedAt: null,
            },
          ],
        },
      ],
    });

    renderWithAdmin('/admin/courses/course-42');

    expect(await screen.findByText('React Foundations')).toBeInTheDocument();
    expect(screen.getByText('Getting Started')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
  });

  it('shows an empty state when no courses match the filters', async () => {
    listCoursesRequestMock.mockResolvedValue({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 1 },
    });

    renderWithAdmin('/admin/courses?status=ARCHIVED');

    expect(await screen.findByText('No courses found. Try adjusting your search or filters.')).toBeInTheDocument();
  });

  it('shows an error state when loading courses fails', async () => {
    listCoursesRequestMock.mockRejectedValue(new Error('Failed to load courses.'));

    renderWithAdmin('/admin/courses');

    expect(await screen.findByText('Failed to load courses.')).toBeInTheDocument();
  });

  it('edits a course from the dedicated edit page', async () => {
    getCourseByIdRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      modules: [],
    });
    updateCourseRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations Advanced',
      description: 'Updated admin workflow course.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      deletedAt: null,
    });

    renderWithAdmin('/admin/courses/course-42/edit');

    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'React Foundations Advanced' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Updated admin workflow course.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(updateCourseRequestMock).toHaveBeenCalledWith('course-42', {
        title: 'React Foundations Advanced',
        description: 'Updated admin workflow course.',
      });
    });
  });

  it('publishes a draft course from the detail page', async () => {
    getCourseByIdRequestMock
      .mockResolvedValueOnce({
        id: 'course-42',
        title: 'React Foundations',
        description: 'Build reliable admin workflows.',
        thumbnailUrl: null,
        status: 'DRAFT',
        instructorId: 'admin-1',
        instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        modules: [],
      })
      .mockResolvedValueOnce({
        id: 'course-42',
        title: 'React Foundations',
        description: 'Build reliable admin workflows.',
        thumbnailUrl: null,
        status: 'PUBLISHED',
        instructorId: 'admin-1',
        instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        modules: [],
      });
    publishCourseRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'PUBLISHED',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      deletedAt: null,
    });

    renderWithAdmin('/admin/courses/course-42');

    fireEvent.click(await screen.findByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(publishCourseRequestMock).toHaveBeenCalledWith('course-42');
    });

    await waitFor(() => {
      expect(getCourseByIdRequestMock).toHaveBeenCalledTimes(2);
    });
  });

  it('archives a published course from the detail page', async () => {
    getCourseByIdRequestMock
      .mockResolvedValueOnce({
        id: 'course-42',
        title: 'React Foundations',
        description: 'Build reliable admin workflows.',
        thumbnailUrl: null,
        status: 'PUBLISHED',
        instructorId: 'admin-1',
        instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        modules: [],
      })
      .mockResolvedValueOnce({
        id: 'course-42',
        title: 'React Foundations',
        description: 'Build reliable admin workflows.',
        thumbnailUrl: null,
        status: 'ARCHIVED',
        instructorId: 'admin-1',
        instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        modules: [],
      });
    archiveCourseRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'ARCHIVED',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      deletedAt: null,
    });

    renderWithAdmin('/admin/courses/course-42');

    fireEvent.click(await screen.findByRole('button', { name: 'Archive' }));

    await waitFor(() => {
      expect(archiveCourseRequestMock).toHaveBeenCalledWith('course-42');
    });
  });

  it('deletes a course from the detail page and returns to the list', async () => {
    getCourseByIdRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'DRAFT',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
      deletedAt: null,
      deletedBy: null,
      modules: [],
    });
    deleteCourseRequestMock.mockResolvedValue(undefined);

    renderWithAdmin('/admin/courses/course-42');

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]);

    await waitFor(async () => {
      const confirmButtons = await screen.findAllByRole('button', { name: 'Delete' });
      expect(confirmButtons).toHaveLength(2);
      fireEvent.click(confirmButtons[1]);
    });

    await waitFor(() => {
      expect(deleteCourseRequestMock).toHaveBeenCalledWith('course-42');
    });
  });

  it('restores a deleted course from the detail page', async () => {
    getCourseByIdRequestMock
      .mockResolvedValueOnce({
        id: 'course-42',
        title: 'React Foundations',
        description: 'Build reliable admin workflows.',
        thumbnailUrl: null,
        status: 'ARCHIVED',
        instructorId: 'admin-1',
        instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        deletedAt: '2026-01-05T00:00:00.000Z',
        deletedBy: 'admin-1',
        modules: [],
      })
      .mockResolvedValueOnce({
        id: 'course-42',
        title: 'React Foundations',
        description: 'Build reliable admin workflows.',
        thumbnailUrl: null,
        status: 'ARCHIVED',
        instructorId: 'admin-1',
        instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-03T00:00:00.000Z',
        deletedAt: null,
        deletedBy: null,
        modules: [],
      });
    restoreCourseRequestMock.mockResolvedValue({
      id: 'course-42',
      title: 'React Foundations',
      description: 'Build reliable admin workflows.',
      thumbnailUrl: null,
      status: 'ARCHIVED',
      instructorId: 'admin-1',
      instructor: { id: 'admin-1', name: 'Admin User', avatarUrl: null },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z',
      deletedAt: null,
    });

    renderWithAdmin('/admin/courses/course-42');

    fireEvent.click(await screen.findByRole('button', { name: 'Restore' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Restore' }))[1]);

    await waitFor(() => {
      expect(restoreCourseRequestMock).toHaveBeenCalledWith('course-42');
    });

    await waitFor(() => {
      expect(getCourseByIdRequestMock).toHaveBeenCalledTimes(2);
    });
  });

});
