import type { ReactElement } from 'react';
import { Route } from 'react-router-dom';
import { AboutPage } from '../pages/public/AboutPage';
import { CommunityPage } from '../pages/public/CommunityPage';
import { ContactPage } from '../pages/public/ContactPage';
import { FaqPage } from '../pages/public/FaqPage';
import { HelpCenterPage } from '../pages/public/HelpCenterPage';
import { InstructorDetailPage } from '../pages/public/InstructorDetailPage';
import { InstructorDirectoryPage } from '../pages/public/InstructorDirectoryPage';
import { LearningPathsPage } from '../pages/public/LearningPathsPage';
import { PublicCourseCatalogPage } from '../pages/public/PublicCourseCatalogPage';
import { PublicCourseDetailPage } from '../pages/public/PublicCourseDetailPage';
import { PublicHomePage } from '../pages/public/PublicHomePage';
import { PublicNotFoundPage } from '../pages/public/PublicNotFoundPage';
import { UnauthorizedPage } from '../pages/public/UnauthorizedPage';

export function PublicRoutes({ fallbackElement }: { fallbackElement: ReactElement }) {
  void fallbackElement;

  return (
    <>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/catalog" element={<PublicCourseCatalogPage />} />
      <Route path="/catalog/:courseId" element={<PublicCourseDetailPage />} />
      <Route path="/learning-paths" element={<LearningPathsPage />} />
      <Route path="/instructors" element={<InstructorDirectoryPage />} />
      <Route path="/instructors/:instructorId" element={<InstructorDetailPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/help-center" element={<HelpCenterPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="/access-denied" element={<UnauthorizedPage />} />
      <Route path="*" element={<PublicNotFoundPage />} />
    </>
  );
}
