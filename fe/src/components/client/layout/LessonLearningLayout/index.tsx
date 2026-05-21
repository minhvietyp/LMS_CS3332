import type { ReactNode } from 'react';
import './LessonLearningLayout.css';

type LessonLearningLayoutProps = {
  sidebar?: ReactNode;
  topBar?: ReactNode;
  content: ReactNode;
  actionPanel?: ReactNode;
};

export function LessonLearningLayout({
  sidebar,
  topBar,
  content,
  actionPanel,
}: LessonLearningLayoutProps) {
  return (
    <div className="lesson-learning-layout">
      {topBar ? <div className="lesson-learning-layout__topbar">{topBar}</div> : null}
      <div className="lesson-learning-layout__body">
        {sidebar ? <aside className="lesson-learning-layout__sidebar">{sidebar}</aside> : null}
        <main className="lesson-learning-layout__content">{content}</main>
        {actionPanel ? <aside className="lesson-learning-layout__actions">{actionPanel}</aside> : null}
      </div>
    </div>
  );
}
