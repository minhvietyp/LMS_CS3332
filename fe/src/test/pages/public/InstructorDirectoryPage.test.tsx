import { screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listPublicInstructorsRequest } = vi.hoisted(() => ({
  listPublicInstructorsRequest: vi.fn(),
}));

vi.mock('../../../services/api/authApi', () => ({
  listPublicInstructorsRequest,
}));

import { InstructorDirectoryPage } from '../../../pages/public/InstructorDirectoryPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

describe('InstructorDirectoryPage', () => {
  afterEach(() => vi.clearAllMocks());

  beforeEach(() => {
    listPublicInstructorsRequest.mockReset();
    listPublicInstructorsRequest.mockResolvedValue([
      {
        id: 'instructor-1',
        name: 'Dr. Ada',
        email: 'ada@example.com',
        role: 'INSTRUCTOR',
        occupation: 'Frontend Instructor',
        bio: 'Teaches frontend architecture.',
        courseCount: 3,
        studentCount: 120,
      },
    ]);
  });

  it('renders public instructor cards', async () => {
    renderPublicPage(<InstructorDirectoryPage />, '/instructors');

    await waitFor(() => expect(listPublicInstructorsRequest).toHaveBeenCalled());
    expect(await screen.findByRole('heading', { name: 'Dr. Ada' })).toBeInTheDocument();
    expect(screen.getByText('Frontend Instructor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View profile' })).toBeInTheDocument();
  }, 10000);
});
