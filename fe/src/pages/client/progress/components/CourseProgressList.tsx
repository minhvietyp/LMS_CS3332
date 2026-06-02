import { useState, useMemo } from 'react';
import { Row, Col, Select, Input, Empty, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import type { CourseProgressItem, EnrollmentStatus } from '../../../../types/progress';
import { CourseProgressCard } from './CourseProgressCard';
import './ProgressFoundation.css';

interface CourseProgressListProps {
  courses: CourseProgressItem[];
  loading?: boolean;
  onViewCourse?: (courseId: string) => void;
  onResume?: (courseId: string) => void;
  onDrop?: (courseId: string) => void;
}

type SortOption = 'latest' | 'completion-asc' | 'completion-desc' | 'name-asc' | 'name-desc';
type StatusFilter = 'all' | EnrollmentStatus;

export function CourseProgressList({
  courses,
  loading = false,
  onViewCourse,
  onResume,
  onDrop,
}: CourseProgressListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedCourses = useMemo(() => {
    let result = [...courses];

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.enrollmentStatus === statusFilter);
    }

    // Search
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.courseTitle.toLowerCase().includes(search) ||
          c.instructorName.toLowerCase().includes(search)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'latest':
          return new Date(b.completedAt ?? b.enrolledAt).getTime() -
            new Date(a.completedAt ?? a.enrolledAt).getTime();
        case 'completion-desc':
          return b.weightedPercentage - a.weightedPercentage;
        case 'completion-asc':
          return a.weightedPercentage - b.weightedPercentage;
        case 'name-asc':
          return a.courseTitle.localeCompare(b.courseTitle);
        case 'name-desc':
          return b.courseTitle.localeCompare(a.courseTitle);
        default:
          return 0;
      }
    });

    return result;
  }, [courses, statusFilter, sortBy, searchTerm]);

  if (loading) {
    return (
      <div className="progress-course-list__loading">
        <Spin size="large" />
      </div>
    );
  }

  if (courses.length === 0) {
    return <Empty description="No courses found" />;
  }

  return (
    <div className="progress-course-list">
      <Row gutter={[16, 16]} className="progress-course-list__filters">
        <Col xs={24} sm={12}>
          <Input
            placeholder="Search courses..."
            prefix={<SearchOutlined />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
          />
        </Col>

        <Col xs={24} sm={6}>
          <Select
            className="progress-course-list__select"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: 'All Courses', value: 'all' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Completed', value: 'COMPLETED' },
              { label: 'Dropped', value: 'DROPPED' },
            ]}
          />
        </Col>

        <Col xs={24} sm={6}>
          <Select
            className="progress-course-list__select"
            value={sortBy}
            onChange={setSortBy}
            options={[
              { label: 'Latest Activity', value: 'latest' },
              { label: 'Progress: High to Low', value: 'completion-desc' },
              { label: 'Progress: Low to High', value: 'completion-asc' },
              { label: 'Name: A to Z', value: 'name-asc' },
              { label: 'Name: Z to A', value: 'name-desc' },
            ]}
          />
        </Col>
      </Row>

      <div className="progress-course-list__results">
        Showing {filteredAndSortedCourses.length} of {courses.length} courses
      </div>

      {filteredAndSortedCourses.length === 0 ? (
        <Empty description="No courses match your filters" />
      ) : (
        <Row gutter={[24, 24]}>
          {filteredAndSortedCourses.map((course) => (
            <Col key={course.courseId} xs={24} sm={12} md={8} lg={6}>
              <CourseProgressCard
                course={course}
                onViewCourse={onViewCourse}
                onResume={onResume}
                onDrop={onDrop}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

