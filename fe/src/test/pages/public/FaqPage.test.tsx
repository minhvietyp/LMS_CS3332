import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FaqPage } from '../../../pages/public/FaqPage';
import { renderPublicPage } from '../../utils/renderPublicPage';

describe('FaqPage', () => {
  it('renders grouped learner FAQs', () => {
    renderPublicPage(<FaqPage />, '/faq');

    expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    expect(screen.getByText('How do I create an account?')).toBeInTheDocument();
    expect(screen.getByText('Where can I see assignments?')).toBeInTheDocument();
  });
});
