import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../services/api/authApi';
import {
  createLessonRequest,
  deleteLessonRequest,
  listCourseModulesRequest,
  updateLessonRequest,
} from '../../services/api/lessonApi';

vi.mock('../../services/api/authApi', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('lessonApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists course modules', async () => {
    mockedApiClient.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 'module-1',
            courseId: 'course-1',
            title: 'Module 1',
            orderIndex: 0,
            lessons: [
              {
                id: 'lesson-1',
                moduleId: 'module-1',
                title: 'Lesson 1',
                orderIndex: 0,
                isPublished: false,
              },
            ],
          },
        ],
      },
    });

    const result = await listCourseModulesRequest('course-1');

    expect(mockedApiClient.get).toHaveBeenCalledWith('/lessons/courses/course-1/modules');
    expect(result[0].lessons[0].title).toBe('Lesson 1');
  });

  it('creates a lesson', async () => {
    mockedApiClient.post.mockResolvedValue({
      data: {
        data: {
          id: 'lesson-2',
          moduleId: 'module-1',
          title: 'Lesson 2',
          videoUrl: 'https://example.com/lesson-2',
          orderIndex: 1,
          isPublished: false,
        },
      },
    });

    const result = await createLessonRequest('module-1', {
      title: 'Lesson 2',
      videoUrl: 'https://example.com/lesson-2',
    });

    expect(mockedApiClient.post).toHaveBeenCalledWith('/lessons/modules/module-1/lessons', {
      title: 'Lesson 2',
      videoUrl: 'https://example.com/lesson-2',
    });
    expect(result.id).toBe('lesson-2');
  });

  it('updates a lesson', async () => {
    mockedApiClient.patch.mockResolvedValue({
      data: {
        data: {
          id: 'lesson-1',
          moduleId: 'module-1',
          title: 'Updated lesson',
          videoUrl: 'https://example.com/updated',
          orderIndex: 0,
          isPublished: true,
        },
      },
    });

    const result = await updateLessonRequest('lesson-1', {
      title: 'Updated lesson',
      videoUrl: 'https://example.com/updated',
      isPublished: true,
    });

    expect(mockedApiClient.patch).toHaveBeenCalledWith('/lessons/lessons/lesson-1', {
      title: 'Updated lesson',
      videoUrl: 'https://example.com/updated',
      isPublished: true,
    });
    expect(result.isPublished).toBe(true);
  });

  it('deletes a lesson', async () => {
    mockedApiClient.delete.mockResolvedValue({});

    await deleteLessonRequest('lesson-1');

    expect(mockedApiClient.delete).toHaveBeenCalledWith('/lessons/lessons/lesson-1');
  });
});
