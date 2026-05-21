# Student Progress Overview Implementation Plan

## 1. Overview

Implement a comprehensive **Student Progress Overview** dashboard that provides students with:
- Dashboard with aggregated statistics (total courses, active, completed, overall progress)
- Course list with individual progress cards
- Recent activity timeline
- Progress visualization (weighted & unweighted percentages)

---

## 2. Scope & Features

### 2.1 Core Features

**Dashboard Summary Widget** (MVP)
- Total enrolled courses
- Active courses (ACTIVE status)
- Completed courses (COMPLETED status)
- Overall progress percentage (aggregate across all courses)
- Last activity timestamp

**Course Progress Cards**
- Course title, thumbnail, instructor name
- Enrollment status (ACTIVE, COMPLETED, DROPPED)
- Unweighted completion percentage
- Weighted completion percentage
- Number of lessons completed / total
- Progress bar visualization
- Quick action buttons (View Course, Drop/Resume)

**Progress Timeline** (Optional for MVP, Phase 2)
- Recent lesson completions
- Enrollment events
- Assignment/quiz submissions
- Course completions

**Filtering & Sorting**
- Filter by status (All, Active, Completed, Dropped)
- Sort by: Latest Activity, Completion %, Course Name
- Search by course name

---

## 3. Architecture & Implementation

### 3.1 Backend Implementation

#### 3.1.1 New API Endpoints

**GET `/api/v1/progress/overview`** (Authenticated Student)
- **Description**: Retrieve student's progress overview dashboard data
- **Response**:
  ```typescript
  {
    summary: {
      totalCourses: number;
      activeCourses: number;
      completedCourses: number;
      droppedCourses: number;
      overallProgress: number; // Aggregate weighted %
      lastActivityAt: ISO8601 | null;
    };
    courses: {
      courseId: string;
      courseTitle: string;
      courseThumbnail: string | null;
      instructorName: string;
      enrollmentStatus: EnrollmentStatus;
      enrolledAt: ISO8601;
      completedAt?: ISO8601;
      lessonsCompleted: number;
      totalLessons: number;
      percentage: number; // Unweighted
      weightedPercentage: number;
      totalWeight: number;
      completedWeight: number;
    }[];
  }
  ```
- **Status Codes**: 200 OK, 401 Unauthorized
- **Authorization**: Authenticated (STUDENT)
- **Caching**: Consider Redis for caching (optional, Phase 2)

**GET `/api/v1/progress/overview/summary`** (Authenticated Student)
- **Description**: Retrieve only summary statistics (lighter payload for mobile)
- **Response**:
  ```typescript
  {
    summary: {
      totalCourses: number;
      activeCourses: number;
      completedCourses: number;
      droppedCourses: number;
      overallProgress: number;
      lastActivityAt: ISO8601 | null;
    };
  }
  ```

**GET `/api/v1/progress/overview/timeline`** (Optional, Phase 2)
- **Description**: Retrieve recent activity timeline
- **Query Parameters**: `limit=10, offset=0`
- **Response**:
  ```typescript
  {
    activities: {
      id: string;
      type: 'LESSON_COMPLETED' | 'COURSE_COMPLETED' | 'ENROLLED' | 'QUIZ_PASSED';
      courseId: string;
      courseTitle: string;
      description: string;
      timestamp: ISO8601;
    }[];
    hasMore: boolean;
  }
  ```

#### 3.1.2 Service Layer Updates

**`be/src/services/progress.service.ts`** — Add new methods:

```typescript
/**
 * Get student's progress overview dashboard data
 * Includes summary stats and course-by-course progress
 */
async getProgressOverview(studentId: string): Promise<ProgressOverviewDTO> {
  // 1. Fetch all enrollments for student
  // 2. For each enrollment, call getCourseProgress()
  // 3. Aggregate data to compute overall progress
  // 4. Count by status (ACTIVE, COMPLETED, DROPPED)
  // 5. Get latest activity timestamp
  // Return combined overview object
}

/**
 * Get student's progress overview summary only
 * (Lighter version for mobile/quick checks)
 */
async getProgressOverviewSummary(studentId: string): Promise<ProgressSummaryDTO> {
  // Fetch count by status and aggregate %
}

/**
 * Get student activity timeline
 */
async getActivityTimeline(
  studentId: string,
  limit: number = 10,
  offset: number = 0
): Promise<ActivityTimelineDTO> {
  // Query Progress, Enrollment, QuizAttempt, Submission ordered by time
}
```

**`be/src/services/enrollment.service.ts`** — Update:

```typescript
/**
 * Get all enrollments for a student with course metadata
 */
async getStudentEnrollments(studentId: string): Promise<EnrollmentWithCourseDTO[]> {
  // Include course title, thumbnail, instructor details
  // Include enrollment timestamps
}
```

#### 3.1.3 Controllers & Routes

**`be/src/controllers/progress.controller.ts`** — Add:

```typescript
async getOverview(req: Request, res: Response) {
  const result = await progressService.getProgressOverview(req.user!.sub);
  return ApiResponse.success(res, result, 'Progress overview retrieved successfully');
}

async getOverviewSummary(req: Request, res: Response) {
  const result = await progressService.getProgressOverviewSummary(req.user!.sub);
  return ApiResponse.success(res, result, 'Progress summary retrieved successfully');
}

async getActivityTimeline(req: Request, res: Response) {
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
  const offset = parseInt(req.query.offset as string) || 0;
  const result = await progressService.getActivityTimeline(req.user!.sub, limit, offset);
  return ApiResponse.success(res, result, 'Activity timeline retrieved successfully');
}
```

**`be/src/routes/progress.routes.ts`** — Add:

```typescript
// Dashboard / Overview routes
router.get(
  '/overview',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  asyncHandler(progressController.getOverview),
);

router.get(
  '/overview/summary',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  asyncHandler(progressController.getOverviewSummary),
);

router.get(
  '/overview/timeline',
  authenticate,
  authorize(USER_ROLES.STUDENT),
  asyncHandler(progressController.getActivityTimeline),
);
```

#### 3.1.4 Validators

**`be/src/validators/progress.validator.ts`** — Add:

```typescript
import { z } from 'zod';

export const timelineQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(1).max(50)).optional().default('10'),
  offset: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().min(0)).optional().default('0'),
});
```

#### 3.1.5 Database Optimizations

**Queries to optimize** (consider adding DB indices):

```prisma
// Efficient query to get student's progress overview
// Query: Find all enrollments for student + course info + progress aggregates
model Enrollment {
  // Existing relations
  // Add index for student + status for faster filtering
  @@index([studentId, status])
}

model Progress {
  // Existing indices
  // Consider composite index for aggregation queries
  @@index([studentId, createdAt])
}
```

**Raw SQL Query Example (optional for performance)**:
```sql
SELECT 
  e.id as enrollmentId,
  c.id, c.title, c.thumbnailUrl,
  u.name as instructorName,
  e.status,
  e.createdAt as enrolledAt,
  e.updatedAt as completedAt,
  COUNT(l.id) as totalLessons,
  SUM(l.weight) as totalWeight,
  COUNT(CASE WHEN p.isCompleted THEN 1 END) as completedLessons,
  SUM(CASE WHEN p.isCompleted THEN l.weight ELSE 0 END) as completedWeight
FROM enrollments e
JOIN courses c ON e.courseId = c.id
JOIN users u ON c.instructorId = u.id
LEFT JOIN course_modules cm ON c.id = cm.courseId
LEFT JOIN lessons l ON cm.id = l.moduleId
LEFT JOIN progress p ON l.id = p.lessonId AND p.studentId = e.studentId
WHERE e.studentId = $1
GROUP BY e.id, c.id, u.id
ORDER BY e.updatedAt DESC;
```

---

### 3.2 Frontend Implementation

#### 3.2.1 New Pages & Components

**`fe/src/pages/StudentDashboardPage.tsx`** (New)
- Main student dashboard page
- Imports child components
- Handles data fetching (useQuery / TanStack Query)

**`fe/src/components/client/progress/ProgressOverview.tsx`** (New)
- Container component for progress dashboard
- Manages state and data fetching
- Responsive layout (mobile-first)

**`fe/src/components/client/progress/ProgressSummary.tsx`** (New)
- Summary widget showing:
  - Total courses badge
  - Active courses badge
  - Completed courses badge
  - Overall progress circular or linear chart
  - Last activity timestamp

**`fe/src/components/client/progress/CourseProgressCard.tsx`** (New)
- Individual course card showing:
  - Course thumbnail & title
  - Instructor name
  - Enrollment status badge
  - Unweighted & weighted progress bars
  - Lessons count (completed/total)
  - Action buttons (View Course, Resume, Drop, Re-enroll)
  - Completion date (if completed)

**`fe/src/components/client/progress/CourseProgressList.tsx`** (New)
- List container for course cards
- Filtering UI (status, search)
- Sorting UI (latest, completion %, name)
- Pagination / infinite scroll

**`fe/src/components/client/progress/ActivityTimeline.tsx`** (Optional, Phase 2)
- Display recent activity items
- Timeline visualization

#### 3.2.2 Hooks & API Services

**`fe/src/hooks/useProgressOverview.ts`** (New)
```typescript
function useProgressOverview() {
  return useQuery({
    queryKey: ['progress', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/progress/overview');
      return data;
    },
  });
}
```

**`fe/src/services/progressService.ts`** (New/Updated)
```typescript
export const progressService = {
  getOverview: async () => api.get('/progress/overview'),
  getOverviewSummary: async () => api.get('/progress/overview/summary'),
  getActivityTimeline: async (limit?: number, offset?: number) =>
    api.get('/progress/overview/timeline', { params: { limit, offset } }),
};
```

#### 3.2.3 Data Models/Types

**`fe/src/types/progress.ts`** (New/Updated)
```typescript
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
  type: 'LESSON_COMPLETED' | 'COURSE_COMPLETED' | 'ENROLLED' | 'QUIZ_PASSED';
  courseId: string;
  courseTitle: string;
  description: string;
  timestamp: string;
}

export interface ActivityTimeline {
  activities: ActivityItem[];
  hasMore: boolean;
}
```

#### 3.2.4 UI/UX Features

**Progress Visualization**
- Circular progress chart (Ant Design: Progress component)
- Linear progress bars (one for unweighted %, one for weighted %)
- Color coding: Red (0-33%), Yellow (33-66%), Green (66-100%)

**Responsive Design**
- Mobile: Stacked cards, full-width
- Tablet: 2-column grid
- Desktop: 3-column grid or sidebar layout

**Accessibility**
- ARIA labels for progress bars
- Keyboard navigation
- Screen reader support

**Localization**
- Use react-i18next for labels & messages
- Support Vietnamese & English

---

## 4. Testing Strategy

### 4.1 Backend Tests

**Unit Tests** (`be/src/services/progress.service.test.ts`)
```typescript
describe('ProgressService.getProgressOverview', () => {
  it('returns correct summary stats for student with multiple courses');
  it('calculates overall progress correctly (weighted aggregate)');
  it('includes all enrollments with course metadata');
  it('handles student with no enrollments (empty array)');
  it('includes correct course progress for each enrollment');
  it('counts by status correctly (ACTIVE, COMPLETED, DROPPED)');
});

describe('ProgressService.getActivityTimeline', () => {
  it('returns recent activities in descending timestamp order');
  it('respects limit and offset parameters');
  it('includes correct activity types');
  it('returns hasMore flag correctly');
});
```

**Route Tests** (`be/src/routes/progress.routes.test.ts`)
```typescript
describe('GET /progress/overview', () => {
  it('returns 200 with overview data for authenticated student');
  it('returns 401 for unauthenticated requests');
  it('returns 403 for non-student roles');
  it('includes all required fields in response');
});
```

**Integration Tests** (Optional)
- Test with real database (test environment)
- Verify database queries performance

### 4.2 Frontend Tests

**Component Tests** (Vitest + React Testing Library)
```typescript
describe('ProgressOverview', () => {
  it('displays summary widget with correct stats');
  it('displays course cards for each enrollment');
  it('filters courses by status');
  it('sorts courses by selected option');
  it('displays loading state while fetching');
  it('displays error message on API failure');
});

describe('CourseProgressCard', () => {
  it('displays course title, thumbnail, instructor');
  it('displays unweighted and weighted progress bars');
  it('shows lessons completed / total');
  it('displays action buttons based on enrollment status');
});
```

**E2E Tests** (Cypress / Playwright, Phase 2)
- Student views dashboard
- Student filters and sorts courses
- Student clicks on course card and navigates to course
- Student checks progress data matches backend

---

## 5. Performance Considerations

### 5.1 Backend Optimizations

**N+1 Query Prevention**
- Use Prisma `include` to load relations in single query
- Alternative: Single raw SQL query for all data

**Database Indices**
```prisma
@@index([studentId, status])        // Enrollment filtering
@@index([studentId, createdAt])     // Timeline queries
@@index([studentId, lessonId])      // Progress lookup
```

**Caching** (Phase 2)
- Cache overview data in Redis with 5-10 min TTL
- Invalidate on enrollment/progress changes
- Consider cache warming

**Query Limits**
- Paginate timeline (default 10, max 50 per page)
- Limit course list to top 100 enrollments

### 5.2 Frontend Optimizations

**Code Splitting**
- Lazy load ProgressOverview page
- Separate bundle for progress components

**Data Fetching**
- Use TanStack Query (React Query) with:
  - Stale-while-revalidate strategy
  - Background refetching on window focus
  - Optimistic updates for actions

**Rendering**
- Virtualize course list if > 50 courses (optional, Phase 2)
- Debounce filter/sort operations (300ms)
- Memoize components to prevent unnecessary re-renders

---

## 6. Deployment & Rollout

### 6.1 Development Phases

**Phase 1 (MVP)** — Weeks 1-2
- Backend: Overview + Summary endpoints, controllers, tests
- Frontend: Dashboard page, Summary widget, Course cards, filters/sort
- Deploy to staging

**Phase 2 (Enhancement)** — Weeks 3-4
- Backend: Activity timeline, caching, query optimization
- Frontend: Timeline component, mobile refinements, E2E tests
- Deploy to production

### 6.2 Rollout Plan

1. **Code Review**: Full PR review with tests
2. **Staging Deployment**: Test in staging environment
3. **Production Rollout**: Feature flag (optional) or direct rollout
4. **Monitoring**: Track API response times, error rates
5. **User Feedback**: Collect feedback from early users

---

## 7. Documentation & References

### 7.1 Files to Create/Update

| File | Type | Status |
|------|------|--------|
| `be/src/services/progress.service.ts` | Update | Add getProgressOverview, getProgressOverviewSummary, getActivityTimeline |
| `be/src/controllers/progress.controller.ts` | Update | Add getOverview, getOverviewSummary, getActivityTimeline |
| `be/src/routes/progress.routes.ts` | Update | Add /overview, /overview/summary, /overview/timeline routes |
| `be/src/validators/progress.validator.ts` | Update | Add timelineQuerySchema |
| `be/src/types/progress.ts` | Create | New types for overview DTOs |
| `fe/src/pages/StudentDashboardPage.tsx` | Create | New page |
| `fe/src/components/client/progress/ProgressOverview.tsx` | Create | Main component |
| `fe/src/components/client/progress/ProgressSummary.tsx` | Create | Summary widget |
| `fe/src/components/client/progress/CourseProgressCard.tsx` | Create | Course card |
| `fe/src/components/client/progress/CourseProgressList.tsx` | Create | Course list |
| `fe/src/hooks/useProgressOverview.ts` | Create | Custom hook |
| `fe/src/services/progressService.ts` | Create | API service |
| `fe/src/types/progress.ts` | Create/Update | Frontend types |

### 7.2 Key Metrics to Track

- API response time for `/progress/overview` (target: < 500ms)
- Component render time (target: < 200ms)
- Cache hit rate (Phase 2)
- User engagement (page views, time spent)

---

## 8. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Slow queries for students with many courses | Use database indices, pagination, caching |
| Frontend component complexity | Break into smaller reusable components, use proper state management |
| API response too large | Implement summary endpoint, pagination for timeline |
| Mobile performance issues | Test on low-end devices, optimize bundle size |
| Stale data in UI | Use proper cache invalidation, real-time updates (WebSocket) |

---

## 9. Future Enhancements (Phase 3+)

- Real-time progress updates via WebSocket
- Mobile app integration
- Progress notifications (e.g., "You're 50% through Course X")
- Gamification (badges, streaks, leaderboard)
- AI-powered recommendations
- Bulk download progress reports (PDF)
- Instructor view of all students' overview (aggregated)
