# ADMIN_COURSE_CRUD_COMPLETION_GUIDE.md

# 1. Module Overview

Admin Course Management is responsible for managing LMS courses from the admin side.

This module is used by:

- ADMIN
- INSTRUCTOR, only for owned courses if reused later

The module must support full CRUD:

- Create course
- Read course detail
- Update course
- Soft delete course
- Restore course, if backend supports it
- Publish course
- Archive course
- Upload course thumbnail
- Search courses
- Filter courses
- Paginate courses

---

# 2. Current Project Status

## Backend Status

Backend is mostly completed for course management.

Implemented backend features:

- list courses
- get course by id
- create course
- update course
- publish course
- archive course
- upload/update thumbnail
- soft delete course

Backend files:

```txt
be/src/routes/course.routes.ts
be/src/services/course.service.ts
```

Important backend capability:

```txt
GET /courses/:id
```

The backend already supports course detail and returns course data with modules and lessons.

---

## Frontend Status

Frontend is NOT full CRUD yet.

Currently implemented:

- list courses
- create course
- update course
- publish course
- archive course
- soft delete course
- thumbnail upload

Current frontend limitation:

- no course detail page
- no get course by id API method
- no paginated list
- no search UI
- no status filter UI
- weak frontend CRUD test coverage

Frontend files:

```txt
fe/src/services/courseApi.ts
fe/src/components/admin/courses/index.tsx
fe/src/pages/CourseManagementPage.tsx
```

---

# 3. Main Missing Features

The course module still needs:

- `getCourseByIdRequest`
- admin course detail page
- course detail route
- display modules and lessons in detail view
- searchable course list
- filterable course list
- paginated course table
- frontend CRUD tests

---

# 4. Course Entity Scope

Only use fields already defined in the LMS project.

Allowed course fields:

```txt
id
title
description
thumbnailUrl
status
instructorId
instructor
publishedAt
createdAt
updatedAt
deletedAt
deletedBy
modules
lessons
```

Allowed course status values:

```txt
DRAFT
PUBLISHED
ARCHIVED
```

Do NOT add unrelated fields such as:

```txt
price
department
billing
marketplace sales
subscription
```

unless they officially exist in the backend schema.

---

# 5. Required Admin Course Pages

## 5.1 Course List Page

Route:

```txt
/admin/courses
```

Purpose:

- display all courses
- search courses
- filter courses
- paginate courses
- manage courses

Required UI:

- page title
- page description
- breadcrumb
- create course button
- search input
- status filter
- instructor filter, optional
- course table
- pagination
- row actions

Recommended table columns:

```txt
Thumbnail
Title
Instructor
Status
Published At
Created At
Actions
```

Recommended row actions:

```txt
View
Edit
Publish
Archive
Delete
Restore, if supported
```

---

## 5.2 Course Detail Page

Route:

```txt
/admin/courses/:id
```

Purpose:

- read and review full course information
- display course content structure

Required UI:

```txt
Course thumbnail
Course title
Course description
Course status
Instructor
Published date
Created date
Updated date
Deleted status
Modules
Lessons
```

Course detail must show modules and lessons.

Recommended sections:

```txt
Course Overview
Course Metadata
Course Modules
Course Lessons
Course Actions
```

Recommended actions:

```txt
Edit
Publish
Archive
Delete
Restore, if supported
```

---

## 5.3 Create Course Page Or Modal

Route option:

```txt
/admin/courses/create
```

Modal option:

```txt
CreateCourseModal
```

Purpose:

- create a new course

Required fields:

```txt
title
description
thumbnail
instructorId
status
```

Default status:

```txt
DRAFT
```

Validation rules:

- title is required
- description is required
- instructorId is required for admin-created course
- thumbnail is optional
- status must be valid

---

## 5.4 Edit Course Page Or Modal

Route option:

```txt
/admin/courses/:id/edit
```

Modal option:

```txt
EditCourseModal
```

Purpose:

- update course metadata

Editable fields:

```txt
title
description
thumbnail
instructorId
status
```

Do not edit course modules and lessons inside the basic course edit form.

Modules and lessons should be managed in the lesson/course content module.

---

# 6. CRUD Requirements

## 6.1 Create

Frontend must support course creation.

Required API method:

```ts
createCourseRequest()
```

Required UI behavior:

- show form
- validate fields
- upload thumbnail if selected
- submit data
- show loading state
- show success message
- refresh course list

---

## 6.2 Read

Frontend must implement course detail read flow.

Missing API method:

```ts
getCourseByIdRequest()
```

Expected usage:

```txt
/admin/courses/:id
```

The detail page must show:

- course metadata
- instructor
- modules
- lessons

This is required for full CRUD completion.

---

## 6.3 Update

Frontend should support editing:

```txt
title
description
thumbnail
instructorId
status
```

Required API method:

```ts
updateCourseRequest()
```

Required UI behavior:

- prefill current course data
- validate fields
- submit only allowed fields
- show success message
- return to detail or list page

---

## 6.4 Delete

Use soft delete only.

Required API method:

```ts
softDeleteCourseRequest()
```

Delete behavior:

```txt
deletedAt = current timestamp
deletedBy = admin id
```

Required UI:

- confirmation modal
- danger button
- success notification
- list refresh

---

## 6.5 Restore

If backend supports restore, frontend should expose restore action.

Required API method:

```ts
restoreCourseRequest()
```

Restore behavior:

```txt
deletedAt = null
deletedBy = null
```

If backend does not support restore yet, mark restore as future improvement.

---

## 6.6 Publish

Required API method:

```ts
publishCourseRequest()
```

Behavior:

```txt
DRAFT → PUBLISHED
publishedAt = current timestamp
```

Publish action should be visible only when course status is `DRAFT`.

---

## 6.7 Archive

Required API method:

```ts
archiveCourseRequest()
```

Behavior:

```txt
PUBLISHED → ARCHIVED
```

Archive action should be visible when course status is `PUBLISHED`.

---

# 7. Search, Filter, And Pagination

The current frontend list is incomplete because it uses:

```tsx
pagination={false}
```

and does not provide search/filter UI.

---

## 7.1 Search

Course list should support search by:

```txt
title
description
instructor name
```

Example query:

```txt
/admin/courses?search=javascript
```

---

## 7.2 Filters

Course list should support filters:

```txt
status
instructorId, optional
includeDeleted
```

Example query:

```txt
/admin/courses?status=PUBLISHED&includeDeleted=false
```

---

## 7.3 Pagination

Course list must support pagination.

Recommended query params:

```txt
page
limit
search
status
instructorId
includeDeleted
```

Example:

```txt
/admin/courses?page=1&limit=10&search=react&status=PUBLISHED
```

Expected response:

```json
{
  "items": [],
  "page": 1,
  "limit": 10,
  "total": 100,
  "totalPages": 10
}
```

---

# 8. Required Frontend API Methods

File:

```txt
fe/src/services/courseApi.ts
```

Must include:

```ts
listCoursesRequest(params)
getCourseByIdRequest(courseId)
createCourseRequest(payload)
updateCourseRequest(courseId, payload)
publishCourseRequest(courseId)
archiveCourseRequest(courseId)
softDeleteCourseRequest(courseId)
uploadCourseThumbnailRequest(courseId, file)
```

Optional if backend supports it:

```ts
restoreCourseRequest(courseId)
```

---

# 9. Recommended Frontend Structure

Recommended components:

```txt
src/components/admin/courses/

CourseTable/
CourseFilters/
CourseSearch/
CourseCreateForm/
CourseEditForm/
CourseDetailCard/
CourseMetadataCard/
CourseModuleList/
CourseLessonList/
CourseStatusTag/
CourseDeleteModal/
CoursePublishAction/
CourseArchiveAction/
CourseThumbnailUpload/
```

Recommended pages:

```txt
src/pages/admin/courses/

CourseListPage.tsx
CourseDetailPage.tsx
CourseCreatePage.tsx
CourseEditPage.tsx
```

If the project currently uses a single component:

```txt
src/components/admin/courses/index.tsx
```

it should be refactored into smaller components.

---

# 10. UI/UX Requirements

Use the LMS Admin Design System.

Course management should feel:

- clean
- structured
- professional
- easy to scan
- table-focused
- consistent with AdminLayout

Use Ant Design components:

```txt
Table
Form
Input
Select
Button
Tag
Modal
Upload
Avatar/Image
Card
Breadcrumb
Pagination
Dropdown
Tooltip
```

---

# 11. Course Table UI

Recommended class names:

```txt
admin-courses-page
admin-courses-page__header
admin-courses-page__toolbar
admin-courses-page__search
admin-courses-page__filters
admin-courses-table
admin-courses-table__thumbnail
admin-courses-table__status
admin-courses-table__actions
```

---

# 12. Course Detail UI

Recommended class names:

```txt
admin-course-detail
admin-course-detail__header
admin-course-detail__actions
admin-course-detail__overview
admin-course-detail__metadata
admin-course-detail__modules
admin-course-detail__lessons
```

Course detail should show modules and lessons clearly.

Recommended layout:

```txt
CourseDetailPage
  CourseOverviewCard
  CourseMetadataCard
  CourseModuleList
  CourseLessonList
```

---

# 13. Status Tag Rules

Course status should use clear visual tags.

Recommended mapping:

```txt
DRAFT      → gray or warning tag
PUBLISHED  → green or blue tag
ARCHIVED   → muted gray tag
DELETED    → red or danger tag
```

---

# 14. Confirmation Modals

Use confirmation modals for destructive or important actions.

Required confirmations:

```txt
Soft delete course
Archive course
Publish course, optional
Restore course, if supported
```

Delete modal example:

```txt
Title:
Delete Course

Message:
Are you sure you want to delete this course? This action will soft delete the course.

Actions:
Cancel
Delete
```

---

# 15. Authorization Rules

Admin course routes require:

```txt
admin:courses:manage
```

Only ADMIN can access all course management pages.

Instructor access rule, if reused later:

```txt
Instructor can only manage owned courses.
```

Unauthorized response:

```txt
403 Forbidden
```

---

# 16. Loading, Empty, And Error States

Every admin course page must support:

- loading state
- empty state
- error state
- success state

Empty state example:

```txt
No courses found.
Try adjusting your search or filters.
```

---

# 17. Responsive Rules

## Desktop

- full table layout
- horizontal toolbar
- detail cards in grid

## Tablet

- compact filters
- horizontal table scroll
- detail cards stack partially

## Mobile

- filters stack vertically
- row actions collapse into dropdown
- table scrolls horizontally
- detail cards stack vertically

---

# 18. Required Testing

Backend tests already exist for many course workflows.

Frontend tests still need stronger coverage.

Required frontend tests:

```txt
renders course list
searches courses
filters by status
paginates courses
opens create course form
creates course
opens course detail page
loads course modules and lessons
edits course
publishes course
archives course
soft deletes course
uploads thumbnail
shows loading state
shows empty state
shows error state
```

---

# 19. Recommended Development Priority

## Priority 1

Complete missing CRUD read flow:

- add `getCourseByIdRequest`
- create `CourseDetailPage`
- route `/admin/courses/:id`
- display modules and lessons

## Priority 2

Complete management list:

- search
- status filter
- pagination

## Priority 3

Improve UI architecture:

- split large course component into smaller components
- add frontend tests
- improve loading/error/empty states

---

# 20. Real Completion Status

## Backend

Approximately:

```txt
85–90% complete
```

## Frontend

Approximately:

```txt
55–65% complete
```

## Overall Admin Course CRUD

Status:

```txt
PARTIALLY COMPLETED
NOT FULL CRUD YET
```

---

# 21. AI Agent Rules

When implementing Admin Course CRUD completion, AI agents must:

- use existing AdminLayout
- use AdminPageContainer
- use LMS Admin Design System
- use only project-approved course fields
- do not add marketplace/payment fields unless explicitly requested
- add missing read/detail flow
- show modules and lessons in detail page
- add search, filters, and pagination
- avoid inline styles
- use meaningful BEM class names
- include loading, empty, and error states
- protect routes with admin permission
- avoid hardcoded fake data