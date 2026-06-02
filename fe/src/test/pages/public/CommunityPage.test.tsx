import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CommunityPage } from '../../../pages/public/CommunityPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

describe('CommunityPage', () => {
  it('renders the public community overview', () => {
    renderPublicPage(<CommunityPage />, '/community');

    expect(screen.getByRole('heading', { name: 'Community' })).toBeInTheDocument();
    expect(screen.getByText('Course announcements')).toBeInTheDocument();
    expect(screen.getByText('Instructor guidance')).toBeInTheDocument();
  });
});
