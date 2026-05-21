export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';

export interface ProgressSummary {
  totalCourses: number;
  activeCourses: number;
  completedCourses: number;
  droppedCourses: number;
  overallProgress: number;
  lastActivityAt: string | null;
}

export interface CourseProgressItem {
  courseId: string;
  courseTitle: string;
  courseThumbnail: string | null;
  instructorName: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: string;
  completedAt?: string;
  lessonsCompleted: number;
  totalLessons: number;
  percentage: number;
  weightedPercentage: number;
  totalWeight: number;
  completedWeight: number;
}

export interface ProgressOverviewData {
  summary: ProgressSummary;
  courses: CourseProgressItem[];
}

export interface ActivityItem {
  id: string;
  type: 'LESSON_COMPLETED' | 'COURSE_COMPLETED' | 'ENROLLED' | 'DROPPED';
  courseId: string;
  courseTitle: string;
  description: string;
  timestamp: string;
}

export interface ActivityTimeline {
  activities: ActivityItem[];
  hasMore: boolean;
}

export interface InstructorProgressCourseSummary {
  id: string;
  title: string;
  totalLessons: number;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
  averageProgress: number;
  averageWeightedProgress: number;
}

export interface InstructorStudentProgressItem {
  studentId: string;
  studentName: string;
  studentEmail: string;
  enrollmentStatus: EnrollmentStatus;
  enrolledAt: string;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  weightedPercentage: number;
  totalWeight: number;
  completedWeight: number;
  lastProgressAt: string | null;
}

export interface InstructorCourseProgressData {
  course: InstructorProgressCourseSummary;
  students: InstructorStudentProgressItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface InstructorStudentCourseProgressDetail {
  course: {
    id: string;
    title: string;
  };
  student: {
    id: string;
    name: string;
    email: string;
  };
  summary: {
    enrollmentStatus: EnrollmentStatus;
    completedLessons: number;
    totalLessons: number;
    percentage: number;
    weightedPercentage: number;
    lastProgressAt: string | null;
  };
  lessons: {
    lessonId: string;
    title: string;
    orderIndex: number;
    weight: number;
    isCompleted: boolean;
    completedAt: string | null;
  }[];
}

export interface AdminProgressOverviewData {
  summary: {
    totalCourses: number;
    totalStudents: number;
    activeStudents: number;
    completedStudents: number;
    droppedStudents: number;
    averageProgress: number;
    averageWeightedProgress: number;
    averageCompletionRate: number;
    lastActivityAt: string | null;
  };
}

export interface AdminCourseProgressItem {
  courseId: string;
  courseTitle: string;
  instructorId: string;
  instructorName: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  totalLessons: number;
  totalStudents: number;
  activeStudents: number;
  completedStudents: number;
  droppedStudents: number;
  averageProgress: number;
  averageWeightedProgress: number;
  completionRate: number;
  lastActivityAt: string | null;
}

export interface AdminCourseProgressListData {
  courses: AdminCourseProgressItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ProgressHistoryItem {
  id: string;
  studentId: string;
  studentName?: string;
  courseId: string;
  courseTitle: string;
  lessonId: string | null;
  lessonTitle: string | null;
  fromState: string | null;
  toState: string;
  actionType: string;
  changedById?: string | null;
  createdAt: string;
}

export interface ProgressHistoryListData {
  items: ProgressHistoryItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
