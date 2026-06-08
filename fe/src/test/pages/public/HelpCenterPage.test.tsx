import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HelpCenterPage } from '../../../pages/public/HelpCenterPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

describe('HelpCenterPage', () => {
  it('renders public support sections', () => {
    renderPublicPage(<HelpCenterPage />, '/help-center');

    expect(screen.getByRole('heading', { name: 'Help Center' })).toBeInTheDocument();
    expect(screen.getByText('Getting started')).toBeInTheDocument();
    expect(screen.getByText('Account and login')).toBeInTheDocument();
    expect(screen.getByText('Assignments and quizzes')).toBeInTheDocument();
    expect(screen.getByText('Grades and progress')).toBeInTheDocument();
  });
});
