import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MarketingLayout } from '../../components/public/MarketingLayout';

const faqItems = [
  {
    question: 'How do I create an account?',
    answer: 'Use the Register link. Public registration creates student access only.',
  },
  {
    question: 'How do I join a course?',
    answer: 'Browse the catalog and open a course detail page. Enrolled course activity is available after sign-in.',
  },
  {
    question: 'Where can I see assignments?',
    answer: 'Assignments are shown inside the authenticated student workspace for courses attached to your account.',
  },
  {
    question: 'How are grades calculated?',
    answer: 'Grades are based on course activity configured by instructors. The public pages do not calculate or expose private grade records.',
  },
  {
    question: 'How do notifications work?',
    answer: 'Notifications appear after sign-in and help you track course updates, assignments, quizzes, chats, and system messages.',
  },
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <MarketingLayout>
      <section className="public-page public-page--faq">
        <div className="public-page-hero">
          <div>
            <span className="public-kicker">FAQ</span>
            <h1 className="public-page-title">Frequently Asked Questions</h1>
            <p className="public-page-copy">
              Practical answers about public browsing, accounts, course work, grades, and notifications.
            </p>
          </div>
        </div>
        <div className="public-faq__list">
          {faqItems.map((item, index) => (
            <article className={`public-faq__item${openIndex === index ? ' is-open' : ''}`} key={item.question}>
              <button
                aria-expanded={openIndex === index}
                className="public-faq__button"
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
              >
                <span>{item.question}</span>
                <ChevronDown size={18} />
              </button>
              <div className="public-faq__answer">
                <div className="public-faq__answer-inner">
                  <p>{item.answer}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
