import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FaqPage } from '../../../pages/public/FaqPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

describe('FaqPage', () => {
  it('renders grouped learner FAQs', () => {
    renderPublicPage(<FaqPage />, '/faq');

    expect(screen.getByText('Frequently asked questions')).toBeInTheDocument();
    expect(screen.getByText('How do learners access a course?')).toBeInTheDocument();
    expect(screen.getByText('What learning materials are shown publicly?')).toBeInTheDocument();
  });
});
