import type { ReactElement } from 'react';
import { Navigate, Route } from 'react-router-dom';
import { AboutPage } from '../pages/public/AboutPage';
import { CommunityPage } from '../pages/public/CommunityPage';
import { ContactPage } from '../pages/public/ContactPage';
import { FaqPage } from '../pages/public/FaqPage';
import { HelpCenterPage } from '../pages/public/HelpCenterPage';
import { InstructorDetailPage } from '../pages/public/InstructorDetailPage';
import { InstructorDirectoryPage } from '../pages/public/InstructorDirectoryPage';
import { PublicCourseCatalogPage } from '../pages/public/PublicCourseCatalogPage';
import { PublicCourseDetailPage } from '../pages/public/PublicCourseDetailPage';
import { PublicHomePage } from '../pages/public/PublicHomePage';

export function PublicRoutes({ fallbackElement }: { fallbackElement: ReactElement }) {
  return (
    <>
      <Route path="/" element={<PublicHomePage />} />
      <Route path="/catalog" element={<PublicCourseCatalogPage />} />
      <Route path="/catalog/:courseId" element={<PublicCourseDetailPage />} />
      <Route path="/instructors" element={<InstructorDirectoryPage />} />
      <Route path="/instructors/:instructorId" element={<InstructorDetailPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      <Route path="/help-center" element={<HelpCenterPage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="*" element={fallbackElement ?? <Navigate to="/" replace />} />
    </>
  );
}
