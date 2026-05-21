# PROJECT_CONTEXT_UPDATED.md

> Updated project context for the Online Learning Management System (LMS).
> This document contains finalized business decisions, architecture updates, coding conventions, and implementation rules.

---

# 1. Project Overview

This project is a traditional Online Learning Management System (LMS).

The system allows administrators and instructors to create and manage online courses, learning materials, students, quizzes, assignments, progress tracking, reports, discussion tools, realtime chat, realtime notifications, and email notifications.

The target scale for version 1 is a few hundred users.

The system architecture should follow:

- Modular Monolith architecture
- MVC (Model - View - Controller) coding structure

The system should remain easy to develop and deploy while still being scalable and maintainable.

---

# 2. Main Goals

The system should support:

- Course content management
- Student management
- Learning progress tracking
- Quiz, test, and assignment management
- Instructor-student interaction
- Realtime chat
- Realtime notifications
- Email notifications
- File and media upload using Cloudinary
- JWT-based authentication
- Role-based authorization
- Docker-based deployment
- Multi-language support (Vietnamese and English)

---

# 3. Product Type

This is a traditional LMS similar to:

- Moodle
- Google Classroom
- Internal training systems

Version 1 does NOT support:

- payment systems
- subscriptions
- course marketplace
- AI recommendation systems
- live streaming classrooms
- mobile applications

---

# 4. Tech Stack

## Frontend

- React
- TypeScript
- Ant Design
- React Router
- Axios or TanStack Query
- Socket.IO client
- react-i18next for multi-language support

## Backend

- Node.js
- Express.js
- TypeScript
- MVC + Modular Monolith architecture
- REST API
- Socket.IO

## Database

Recommended:

- PostgreSQL

ORM:

- Prisma ORM

## Authentication

- JWT Access Token
- JWT Refresh Token
- Refresh token stored in database

## File Storage

- Cloudinary

Used for:

- thumbnails
- PDF files
- slides
- documents
- avatars

Video lessons should use:

- YouTube URLs

instead of uploading video files directly.

## Deployment

- Docker
- Docker Compose

---

# 5. Architecture Style

The project should use:

- Modular Monolith architecture
- MVC coding pattern

Each business module should contain:

```txt
module/
  controllers/
  services/
  repositories/
  models/
  validators/
  routes/
  types/
  permissions/
```

## MVC Responsibilities

### Model

Responsible for:

- database models
- Prisma interaction
- repositories
- business data access

### View

Responsible for:

- frontend React UI
- API responses
- presentation layer

### Controller

Responsible for:

- handling requests
- calling services
- returning responses
- validation flow

### Service Layer

Responsible for:

- business logic
- workflow handling
- complex operations

Business logic must NOT be placed directly inside controllers.

---

# 6. Core User Roles

## Admin

Can:

- manage all users
- manage all courses
- assign instructors
- view reports
- manage settings

## Instructor

Can:

- create and manage assigned courses
- create lessons and materials
- create quizzes and assignments
- grade submissions
- communicate with students
- send notifications

## Student

Can:

- access assigned courses
- view lessons
- complete lessons
- take quizzes
- submit assignments
- view progress
- join chats
- receive notifications

---

# 7. Course Management Rules

## Course Status

A course can have:

```txt
DRAFT
PUBLISHED
ARCHIVED
```

### Meaning

- DRAFT: hidden from students
- PUBLISHED: visible to enrolled students
- ARCHIVED: inactive but preserved for history

## Course Ownership

- Each course has exactly ONE instructor.

Relationship:

```txt
Instructor 1 --- N Course
```

---

# 8. Enrollment Rules

The enrollment system works similarly to Google Classroom.

Rules:

- Students cannot self-enroll.
- Admins or instructors assign students to courses.
- Enrollment happens automatically.
- No invitation acceptance is required.

When enrollment occurs:

- create Enrollment record
- send realtime notification
- send email notification

---

# 9. Lesson Rules

## Lesson Completion Logic

A lesson is completed when the student manually clicks:

```txt
Mark as Complete
```

Version 1 does NOT require:

- video percentage tracking
- watch time validation

## Lesson Content

Lessons may contain:

- YouTube video URL
- PDF
- slides
- reading materials
- external links

---

# 10. Quiz Rules

## Supported Question Types

Version 1 supports:

```txt
MULTIPLE_CHOICE
TRUE_FALSE
```

Short-answer questions are excluded from version 1.

## Quiz Attempts

Students can attempt a quiz:

- multiple times
- maximum 3 attempts

Suggested fields:

```txt
Quiz.maxAttempts
QuizAttempt.attemptNumber
```

## Passing Score

Each quiz has a configurable passing score set by the instructor.

Suggested field:

```txt
Quiz.passingScore
```

---

# 11. Assignment Rules

Assignments support:

- text submission
- file upload
- both text and file together

## Assignment Deadline

Assignments:

- have due dates
- allow late submission

Suggested fields:

```txt
Assignment.dueDate
Assignment.allowLateSubmission
```

## Grading System

Assignments use numeric grading:

```txt
0 - 100
```

## Submission Status

Suggested statuses:

```txt
ON_TIME
LATE
GRADED
RETURNED
```

---

# 12. Progress Tracking

The system should track:

- completed lessons
- lesson completion state
- quiz attempts
- assignment submissions
- course completion percentage
- learning history

Progress should be available for:

- students
- instructors
- admins

---

# 13. Chat System

Realtime chat should use Socket.IO.

## Supported Chat Types

### Direct Chat

```txt
Instructor ↔ Student
```

### Course Group Chat

```txt
Course group chat
```

## ChatRoom Types

```txt
DIRECT
COURSE
```

---

# 14. Notification System

The system should support:

- realtime notifications
- database notification history
- email notifications

## Notification Examples

- course published
- assignment deadline reminder
- quiz result available
- instructor feedback
- new chat message

## Notification Tracking

Notifications should include:

```txt
isRead
readAt
```

## Suggested Notification Types

```txt
COURSE
QUIZ
ASSIGNMENT
CHAT
SYSTEM
```

---

# 15. Soft Delete Rules

Soft delete should be implemented for:

- User
- Course
- Lesson

Suggested fields:

```txt
deletedAt
deletedBy
```

Records should not be permanently removed immediately.

---

# 16. Recommended Backend Structure

```txt
src/
  app.ts
  server.ts
  config/
  shared/
    constants/
    errors/
    middlewares/
    utils/
    types/
  modules/
    auth/
      controllers/
      services/
      repositories/
      models/
      validators/
      routes/
      types/

    users/
    courses/
    lessons/
    enrollments/
    progress/
    quizzes/
    assignments/
    submissions/
    reports/
    chat/
    notifications/
    files/

  prisma/
    schema.prisma
```

---

# 17. Recommended Database Entities

```txt
User
Role
Course
CourseModule
Lesson
LessonMaterial
Enrollment
Progress
Quiz
Question
AnswerOption
QuizAttempt
QuizAttemptAnswer
Assignment
Submission
ChatRoom
ChatMessage
Notification
FileAsset
RefreshToken
EmailLog
```

---

# 18. Recommended Base Fields

Most entities should contain:

```txt
id
createdAt
updatedAt
deletedAt
```

---

# 19. Authentication Rules

The system uses:

- JWT access token
- JWT refresh token

Refresh tokens must:

- be stored in database
- support logout
- support token revocation

---

# 20. Coding Rules

All developers and AI coding agents must follow these rules:

1. Use TypeScript strictly.
2. Follow MVC architecture.
3. Follow Modular Monolith structure.
4. Do not place business logic in controllers.
5. Controllers only handle requests and responses.
6. Services contain business logic.
7. Repositories handle database operations.
8. Use Prisma ORM.
9. Use centralized error handling.
10. Use environment variables for secrets.
11. Never hardcode JWT secrets.
12. Use Socket.IO for realtime features.
13. Use Cloudinary for files.
14. Use Docker for development and deployment.
15. Use REST API conventions.
16. Support Vietnamese and English.
17. Use soft delete where required.

---

# 21. Version 1 Scope

Version 1 should include:

- authentication
- authorization
- user management
- course management
- module and lesson management
- enrollment system
- lesson progress tracking
- quiz system
- assignment system
- realtime chat
- realtime notifications
- email notifications
- reports
- Docker setup

---

# 22. Recommended Development Roadmap

## Phase 1

### project setup
- Initialize Node.js + TypeScript project
- Configure `tsconfig.json`, ESLint, Prettier
- Set up folder structure (`src/modules`, `src/shared`, `src/config`)
- Configure environment variables with `.env` and `dotenv`
- Set up centralized error handling middleware
- Set up global response format

### Docker setup
- Write `Dockerfile` for backend
- Write `docker-compose.yml` with services: `app`, `postgres`
- Configure volume for PostgreSQL data persistence
- Configure `.env` injection into containers

### PostgreSQL setup
- Provision PostgreSQL container
- Create application database
- Configure connection string in environment variables

### Prisma setup
- Install and initialize Prisma
- Configure `schema.prisma` with PostgreSQL datasource
- Define base entity fields (`id`, `createdAt`, `updatedAt`, `deletedAt`)
- Run initial migration
- Set up Prisma Client singleton

### MVC structure
- Create base module folder structure (`controllers/`, `services/`, `repositories/`, `routes/`, `validators/`, `types/`)
- Create shared utilities (`ApiResponse`, `AppError`, `asyncHandler`)
- Set up global router mounting in `app.ts`

### auth module
- **User Registration** — register with `name`, `email`, `password`; hash password with bcrypt
- **User Login** — validate credentials, issue JWT access token + refresh token
- **Refresh Token** — accept refresh token, validate against DB, issue new access token
- **Logout** — revoke refresh token from database
- **Token Revocation** — delete or invalidate stored refresh token on logout
- **JWT Middleware** — `authenticate` middleware to protect routes; decode and attach `req.user`
- **Password Hashing** — bcrypt with configurable salt rounds
- **RefreshToken model** — store token hash, userId, expiresAt, isRevoked in DB
- **Auth validators** — validate registration and login request bodies (Zod or Joi)
- **Auth routes** — `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`

### login feature breakdown

#### backend
- Define the login request and response contract in the auth module
- Validate `email` and `password` with the login schema before reaching the service
- Check user existence and `isActive` status in the auth service
- Verify the password using bcrypt comparison
- Issue a short-lived JWT access token with `sub`, `email`, and `role`
- Generate a secure refresh token string and store only its hash in the database
- Return the access token, refresh token, and sanitized user profile
- Keep login failures generic to avoid revealing whether the email or password was incorrect
- Add rate limiting or stricter auth throttling for login attempts if needed

#### frontend
- Create a dedicated login page with email and password fields
- Build a reusable form component structure that follows the frontend UI rules
- Submit credentials to `POST /auth/login` through a centralized API client
- Show loading, success, and error states during login
- Store the returned access token and user profile in auth state and persistence storage
- Redirect authenticated users away from the login page
- Redirect users to the intended protected route after successful login
- Display a clear message when login fails
- Keep the login UI semantic, maintainable, and styled with reusable classes or SCSS modules

#### validation
- Validate required fields on the frontend before submit
- Confirm backend schema validation rejects malformed emails and empty passwords
- Verify login succeeds with a valid active user
- Verify login fails for inactive users
- Verify login fails for wrong credentials without leaking which field was wrong
- Verify refresh token storage is created on successful login
- Verify logout invalidates the stored refresh token
- Test the full flow after page reload to ensure persisted auth state still works
- Add integration or API tests for login, refresh, and logout behavior

---

## Phase 2

### user management
- **List users** — paginated list with search by name/email, filter by role/status
- **Get user by ID** — return full user profile
- **Create user** (Admin only) — create user and assign initial role
- **Update user** — update `name`, `email`, `avatar`, `status`
- **Soft delete user** — set `deletedAt` and `deletedBy`, exclude from active queries
- **Restore user** — clear `deletedAt` to reactivate user
- **Change user status** — activate or deactivate account
- **Avatar upload** — upload avatar image to Cloudinary, store URL in user profile
- **User profile** — student/instructor can view and update their own profile
- **User validators** — validate all update payloads

### RBAC system
- **Role model** — define `Role` entity (`ADMIN`, `INSTRUCTOR`, `STUDENT`)
- **UserRole relation** — assign one or multiple roles to a user
- **Permission constants** — define permission keys per module (e.g., `course:create`, `quiz:grade`)
- **Role-permission map** — map each role to its allowed permissions
- **`authorize` middleware** — check `req.user.role` against required permission; return 403 if denied
- **Guard decorators / helper** — reusable permission check helpers for routes
- **Seed roles** — seed initial roles and admin user on first run

### course module

---


- **Create course** — instructor creates course with `title`, `description`, `thumbnail`, `status=DRAFT`
- **Update course** — edit course metadata, thumbnail upload to Cloudinary
- **Publish course** — change status from `DRAFT` to `PUBLISHED`
- **Archive course** — change status to `ARCHIVED`
- **Soft delete course** — set `deletedAt`, exclude from active queries
- **List courses** — paginated list; admin sees all, instructor sees own, student sees enrolled
- **Get course detail** — return course with modules and lessons
- **Course ownership** — enforce that only the assigned instructor or admin can modify
- **Course thumbnail** — upload thumbnail image to Cloudinary
- **Course validators** — validate create/update payloads

### lesson module
- **Create module (CourseModule)** — group lessons under a named module with order index
- **Update / delete module** — edit title or remove module
- **Create lesson** — create lesson with `title`, `type`, `videoUrl`, `order` under a module
- **Update lesson** — edit lesson content, reorder
- **Soft delete lesson** — set `deletedAt`
- **Lesson materials** — attach PDFs, slides, links, reading materials (upload to Cloudinary)
- **List lessons** — return ordered list of lessons within a module
- **Get lesson detail** — return lesson with all materials
- **Lesson order management** — reorder lessons within a module
- **Lesson validators** — validate lesson create/update payloads

---

## Phase 3

### enrollment system
- **Enroll student** — admin or instructor assigns a student to a course; create `Enrollment` record
- **Unenroll student** — remove enrollment (soft or hard delete based on decision)
- **List enrollments** — list all students enrolled in a course (instructor/admin view)
- **List enrolled courses** — list all courses a student is enrolled in
- **Enrollment status** — track `ACTIVE`, `COMPLETED`, `DROPPED`
- **Enrollment trigger** — on enrollment: send realtime notification + email notification
- **Enrollment validators** — validate enrollment request payload
- **Enrollment routes** — `POST /enrollments`, `DELETE /enrollments/:id`, `GET /courses/:id/students`

### progress tracking
- **Mark lesson complete** — student clicks "Mark as Complete"; create or update `Progress` record
- **Lesson progress state** — track `isCompleted`, `completedAt` per lesson per student
- **Course completion percentage** — calculate `completedLessons / totalLessons * 100`
- **Student progress overview** — return all lesson completion states for a student in a course
- **Instructor progress view** — instructor views all students' progress in their course
- **Admin progress view** — admin can view any student's progress
- **Progress history** — maintain a log of when each lesson was completed
- **Progress validators** — validate mark-complete request
- **Progress routes** — `POST /progress/lessons/:lessonId/complete`, `GET /courses/:id/progress`

---

## Phase 4

### quiz system
- **Create quiz** — instructor creates quiz with `title`, `description`, `passingScore`, `maxAttempts`
- **Update / delete quiz** — edit or remove quiz
- **Create question** — add `MULTIPLE_CHOICE` or `TRUE_FALSE` question to quiz
- **Create answer options** — add answer choices; mark correct answer(s)
- **Update / delete question** — edit or remove questions and options
- **Publish quiz** — make quiz available to enrolled students
- **Take quiz** — student starts quiz attempt; create `QuizAttempt` record
- **Submit quiz** — student submits answers; auto-grade based on correct options
- **Quiz result** — return score, pass/fail, correct answers after submission
- **Max attempts enforcement** — block attempt if `attemptNumber >= maxAttempts`
- **Quiz attempt history** — return all past attempts for a student on a quiz
- **Quiz validators** — validate create quiz, create question, submit quiz payloads
- **Quiz routes** — full CRUD for quiz, questions, options; submit and result endpoints

### assignment system
- **Create assignment** — instructor creates assignment with `title`, `description`, `dueDate`, `allowLateSubmission`
- **Update / delete assignment** — edit or remove assignment
- **Submit assignment** — student submits `text` and/or file upload to Cloudinary
- **Submission status tracking** — auto-set `ON_TIME` or `LATE` based on `dueDate`
- **Grade submission** — instructor grades with score `0–100`, adds feedback text
- **Return submission** — mark submission as `RETURNED` after grading
- **List submissions** — instructor views all submissions for an assignment
- **Student submission view** — student views their own submission and grade
- **Late submission handling** — allow or block late submissions based on `allowLateSubmission` flag
- **File upload** — upload submission files to Cloudinary
- **Assignment validators** — validate create, submit, grade payloads
- **Assignment routes** — CRUD for assignments; submit, grade, list submission endpoints

---

## Phase 5

### chat system
- **ChatRoom model** — support `DIRECT` (1-to-1) and `COURSE` (group) room types
- **Create direct chat** — create or retrieve existing `DIRECT` room between two users
- **Create course group chat** — auto-create `COURSE` room when a course is published
- **Send message** — emit message via Socket.IO; persist `ChatMessage` to DB
- **Receive message** — broadcast message to all room participants in realtime
- **Chat history** — paginated REST endpoint to load past messages
- **Mark message as read** — track read receipts
- **Online presence** — show online/offline status via Socket.IO connected users map
- **Socket.IO authentication** — validate JWT token on socket handshake
- **Chat routes** — `GET /chat/rooms`, `GET /chat/rooms/:id/messages`, room creation endpoints

### notifications
- **Notification model** — store `type`, `message`, `isRead`, `readAt`, `userId`, `referenceId`
- **Create notification** — service function to create and emit notification on trigger events
- **Realtime delivery** — emit notification via Socket.IO to specific user room
- **Notification history** — REST endpoint to list all notifications for current user
- **Mark as read** — update `isRead=true`, `readAt=now` for single or all notifications
- **Unread count** — return count of unread notifications for badge display
- **Notification types** — support `COURSE`, `QUIZ`, `ASSIGNMENT`, `CHAT`, `SYSTEM`
- **Notification triggers** — enrollment, assignment deadline, quiz result, instructor feedback, new chat message
- **Notification routes** — `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`

### email service
- **Email provider setup** — configure Nodemailer with SMTP or SendGrid
- **Email templates** — HTML templates for: welcome, enrollment confirmation, assignment deadline reminder, quiz result, instructor feedback
- **Send email utility** — reusable `sendEmail(to, subject, template, data)` function
- **Email queue** — handle failures gracefully; retry or log failed sends
- **EmailLog model** — log every email sent with `status`, `recipient`, `subject`, `sentAt`
- **Trigger points** — send emails on: user registration (welcome), enrollment, assignment deadline (scheduled), quiz result, graded submission
- **Multi-language email** — support Vietnamese and English email content

---

## Phase 6

### reports
- **Student progress report** — per-student summary of completed lessons, quiz scores, assignment grades
- **Course completion report** — list of students and their completion percentage per course
- **Quiz performance report** — average score, pass rate, attempt distribution per quiz
- **Assignment submission report** — submission counts, on-time vs late rate, average grade
- **Instructor activity report** — courses created, lessons published, students managed
- **Admin dashboard summary** — total users, courses, enrollments, active sessions
- **Export reports** — export report data as CSV or PDF
- **Report routes** — `GET /reports/students/:id`, `GET /reports/courses/:id`, `GET /reports/admin/summary`

### optimization
- **Database indexing** — add indexes on frequently queried fields (`userId`, `courseId`, `status`, `createdAt`)
- **Query optimization** — review and optimize Prisma queries; use `select` to avoid over-fetching
- **Pagination** — enforce cursor-based or offset pagination on all list endpoints
- **Response caching** — cache heavy read endpoints (reports, course lists) with in-memory or Redis cache
- **Rate limiting** — add rate limiting middleware to auth and public endpoints
- **Input sanitization** — sanitize all user inputs to prevent XSS and injection
- **API response time audit** — profile slow endpoints and optimize
- **Error logging** — integrate structured logging (e.g., Winston or Pino)

### deployment
- **Production Dockerfile** — multi-stage build for smaller production image
- **docker-compose.prod.yml** — production compose with proper environment separation
- **Environment configuration** — separate `.env.development` and `.env.production`
- **Database migration strategy** — run `prisma migrate deploy` on container startup
- **Health check endpoint** — `GET /health` returning service status
- **CI/CD pipeline** — basic GitHub Actions workflow for lint, test, build, deploy
- **SSL / reverse proxy** — configure Nginx as reverse proxy with HTTPS
- **Deployment documentation** — write step-by-step deployment guide

---

# 23. Final Product Decisions

```txt
Architecture: Modular Monolith + MVC
Frontend: React + TypeScript + Ant Design
Backend: Express.js + TypeScript
Database: PostgreSQL
ORM: Prisma
Auth: JWT Access + Refresh Token
Realtime: Socket.IO
Storage: Cloudinary
Video: YouTube URL
Deployment: Docker
Languages: Vietnamese + English
Enrollment: Instructor/Admin assign only
Quiz Attempts: Maximum 3
Assignment Submission: File + Text
Soft Delete: User, Course, Lesson



```
# 24. Frontend UI and Styling Rules

All AI coding agents must follow these frontend UI rules:

## CSS and Class Naming

1. Always add meaningful `className` or `class` attributes to HTML and React elements.

Bad example:

```jsx
<div>
  <h2>Hello</h2>
</div>
```

Good example:

```jsx
<div className="course-card">
  <h2 className="course-card__title">Hello</h2>
</div>
```

---

## Avoid Inline Styles

Do NOT use inline styles unless explicitly requested.

Bad example:

```jsx
<div style={{ padding: 20 }}>
```

Use CSS/SCSS modules or reusable utility classes instead.

---

## Reusable UI Components

Avoid duplicated UI structures.

If a UI block appears multiple times:

* create reusable React components
* create shared layout components
* create reusable form components

Examples:

* Button
* Modal
* Table
* FormInput
* CourseCard
* NotificationItem

---

## Consistent Naming Convention

Use consistent naming styles:

Recommended:

```txt
block__element--modifier
```

Example:

```txt
course-card
course-card__title
course-card__footer
course-card--active
```

---

## Keep JSX Clean

Avoid deeply nested JSX structures.

Bad example:

```jsx
<div>
  <div>
    <div>
      <div>
```

Split into reusable components instead.

---

## Styling Strategy

Preferred styling order:

1. SCSS Modules
2. Ant Design component styling
3. Shared utility classes

Avoid large global CSS files.

---

## Component Structure

Recommended React component structure:

```txt
ComponentName/
  index.tsx
  styles.scss
  types.ts
```

---

## HTML Readability

Generated HTML should be:

* semantic
* properly indented
* readable
* easy to maintain

Use:

* section
* article
* nav
* aside
* header
* footer

when appropriate.

---

## Avoid Repeated Tailwind-Like Long Class Chains

Avoid generating excessively long class strings repeatedly.

Instead:

* extract reusable classes
* create wrapper components
* use SCSS reusable styles

---

## AI Agent UI Goal

Frontend code generated by AI agents should be:

* maintainable
* reusable
* scalable
* easy to style
* clean and readable


# 25. Frontend UI/UX Style Direction

The LMS frontend must use one shared design system, but it should have two different visual directions:

* **Admin style**: for Admin dashboards and management screens.
* **Client style**: for Student and Instructor learning/course screens.

Both styles share the same colors, typography, spacing, radius, and reusable component rules. The difference is how the UI feels and how dense the layout is.

---

## 25.1 Shared Design Foundation

Use the provided UI reference screenshots as the base visual direction.

---

## Core Color Palette

```txt
Primary Color: #2F67EF
Secondary Color: #B966E7
Coral Color: #E9967A
Violet Color: #800080
Pink Color: #DB7093

Heading Color: #192336
Body Color: #6B7385

White Color: #FFFFFF
Off White Color: #FFFAFB

Body Dark Color: #273041
Dark Color: #27272E
Darker Color: #192336
Black Color: #111113

Gray Color: #A1A9AC
Gray Light Color: #F6F6F6
Gray Lighter Color: #EBEBEB

Light Color: #F4F5F7
Lighter Color: #F2F6F9

Success Color: #3EB75E
Danger Color: #FF0003
Warning Color: #FF8F3C
Info Color: #1BA2DB
```

---

## Typography Rules

The UI should use a rounded, modern, friendly sans-serif style.

Rules:

* Use bold headings.
* Use `#192336` for headings.
* Use `#6B7385` for normal body text.
* Use clear heading hierarchy (`h1 → h6`).
* Admin pages should use smaller and denser headings.
* Client pages may use larger and more expressive headings.
* Avoid negative letter spacing.
* Do not scale font size directly with viewport width.
* Text must not overflow buttons, cards, tables, or forms.

---

## Border Radius Rules

```txt
Small Radius: 4px
Medium Radius: 6px
Default Radius: 8px
Large Radius: 10px
Round Radius: 999px
```

Default UI radius should be `8px`.

---

## Design Tokens

All reusable design values must be centralized.

Recommended structure:

```txt
src/styles/tokens/
  colors.scss
  spacing.scss
  radius.scss
  shadows.scss
  typography.scss
  z-index.scss
```

Do not hardcode spacing, colors, or radius repeatedly inside components.

---

# 26. Admin UI Style

Admin UI is used for:

* admin dashboard
* user management
* role and permission management
* reports
* course oversight
* system settings

Admin UI should feel:

* professional
* clean
* structured
* readable
* easy to scan
* efficient for repeated work

---

## 26.1 Admin Visual Rules

Use:

* white or very light page background
* dark heading text `#192336`
* muted body text `#6B7385`
* primary blue `#2F67EF` for main actions
* simple white cards
* subtle shadows
* thin borders
* clear tables
* compact toolbars
* status tags
* pagination

Avoid:

* heavy gradients
* too many decorative elements
* large marketing-style hero sections
* animated headings
* oversized cards
* colorful UI everywhere

---

## 26.2 Admin Layout Pattern

```txt
main.admin-page
  section.admin-page__panel
    header.admin-page__header
    div.admin-page__toolbar
    section.admin-page__content
```

Recommended widths:

```txt
Dashboard Pages: 1180px
Table Pages: 1040px - 1180px
Form/Settings Pages: 720px - 860px
```

---

## 26.3 Admin UX Rules

Admin pages must prioritize:

* search
* filters
* sorting
* pagination
* table actions
* status visibility
* confirmation dialogs
* loading states
* error states
* empty states

---

# 27. Client UI Style

Client UI is used for:

* student dashboard
* instructor dashboard
* enrolled courses
* course detail
* lesson player
* quiz taking
* assignment submission
* progress tracking
* chat
* notifications

Client UI should feel:

* friendly
* modern
* learning-focused
* visual
* clear

---

## 27.1 Client Visual Rules

Use:

* primary blue `#2F67EF`
* secondary purple `#B966E7`
* soft gradient accents
* course thumbnails
* progress indicators
* avatars
* rounded buttons
* light backgrounds

Avoid:

* dense admin-style tables unless required
* distracting animation during learning
* dark-heavy lesson pages

---

## 27.2 Client Layout Pattern

```txt
main.client-page
  section.client-page__header
  section.client-page__content
```

---

## 27.3 Client UX Rules

Client pages must prioritize:

* next learning action
* course progress
* assignment deadline clarity
* quiz attempt status
* readable lesson content
* clear success/error feedback

---

# 28. Role-Specific UX Rules

## Admin

Focus on:

* system management
* reports
* user control
* permissions
* course oversight

Preferred UI:

* tables
* filters
* compact cards
* confirmation modals

---

## Instructor

Focus on:

* course creation
* lesson management
* grading
* student monitoring

Preferred UI:

* forms
* course builder layouts
* grading panels
* lesson/module lists

---

## Student

Focus on:

* learning experience
* lesson progress
* assignments
* quizzes
* notifications

Preferred UI:

* course cards
* lesson viewer
* progress bars
* deadline badges

---

# 29. Responsive Design Rules

The LMS frontend must be responsive and mobile-friendly.

Recommended breakpoints:

```txt
Mobile: 0 - 767px
Tablet: 768px - 1023px
Desktop: 1024px+
Large Desktop: 1280px+
```

Rules:

* avoid horizontal scrolling
* responsive tables
* collapsible sidebar
* responsive course grid
* stacked forms on mobile
* touch-friendly buttons

---

## 29.1 Additional Responsive Rules

### Responsive Grid Rules

```txt
Desktop: 4 columns
Tablet: 2 columns
Mobile: 1 column
```

---

### Responsive Sidebar Rules

```txt
Desktop:
- expanded sidebar

Tablet:
- collapsible sidebar

Mobile:
- drawer/sidebar overlay
```

---

### Responsive Table Rules

Tables should support:

* horizontal scrolling
* sticky headers
* compact mobile layouts

---

### Responsive Typography Rules

Rules:

* avoid tiny text below 14px
* prevent text overflow
* maintain readable line height

---

### Responsive Modal Rules

Rules:

* full-width mobile modals
* mobile-friendly scrolling
* avoid oversized forms

---

### Responsive Form Rules

Rules:

* full-width mobile inputs
* vertically stacked forms
* touch-friendly buttons

---

### Responsive Media Rules

```css
img,
video,
iframe {
  max-width: 100%;
  height: auto;
}
```

---

### Touch-Friendly UX Rules

Recommended minimum touch size:

```txt
44px × 44px
```

---

### Responsive Testing Rules

Test UI on:

```txt
320px
375px
768px
1024px
1280px+
```

---

# 30. UI State Rules

Every major component should support:

* loading state
* empty state
* error state
* success state

Recommended reusable components:

```txt
LoadingState
EmptyState
ErrorState
SuccessAlert
SkeletonLoader
```

---

# 31. Accessibility Rules

Rules:

* buttons must have labels
* inputs must have labels
* keyboard navigation should work
* color should not be the only status indicator
* maintain readable contrast

---

# 32. Animation Rules

Use animation for:

* modal transitions
* dropdowns
* hover feedback
* loading feedback

Avoid:

* excessive motion
* distracting effects

---

# 33. Form UX Rules

Forms should:

* show validation clearly
* disable submit while submitting
* preserve input after validation errors
* provide success feedback

Long forms should be split into sections.

---

# 34. Table UX Rules

Tables should support:

* pagination
* filtering
* sorting
* row actions
* loading states
* responsive overflow

---

# 35. Layout System Rules

Recommended reusable layouts:

```txt
AdminLayout
InstructorLayout
StudentLayout
AuthLayout
CourseLayout
LessonLayout
```

---

# 36. Implementation Rules For Admin And Client Styles

Do not mix Admin and Client styles randomly.

Use shared design tokens and reusable components, but separate page-level class names.

Recommended class naming:

```txt
admin-page
admin-card
admin-toolbar
admin-table

client-page
client-card
client-course-card
client-progress
client-lesson-viewer
```

Before finishing any frontend UI:

* verify responsive behavior
* ensure loading/error/empty states exist
* avoid inline styles
* extract reusable UI
* ensure mobile compatibility
* use meaningful BEM class names
* keep Ant Design styling consistent

# 37. Analytics And Data Visualization Rules

The LMS should support basic learning analytics for:

* Instructor
* Student

Analytics should help visualize:

* learning progress
* quiz performance
* assignment activity

Recommended chart library:

```txt
@ant-design/charts
```

Charts should remain:

* simple
* readable
* responsive
* learning-focused

Avoid excessive or overly complex analytics.

---

# 37.1 Student Progress Analytics

Student progress analytics should help track learning completion and engagement.

Recommended charts:

* Progress Chart
* Line Chart

Example data:

```txt
course completion rate
lesson completion rate
```

Suggested use cases:

* student dashboard
* instructor course overview
* progress tracking page

---

# 37.2 Quiz Performance Analytics

Quiz analytics should help instructors evaluate quiz difficulty and student performance.

Recommended charts:

* Column Chart
* Radar Chart

Example data:

```txt
average score
pass rate
question difficulty
```

Suggested use cases:

* instructor dashboard
* quiz result page
* course analytics section

---

# 37.3 Assignment Analytics

Assignment analytics should help instructors monitor submission activity.

Recommended charts:

* Stacked Bar Chart

Example data:

```txt
submitted
late
missing
graded
```

Suggested use cases:

* assignment management page
* instructor dashboard
* course progress overview

---

# 37.4 Analytics UI Rules

Analytics components should:

* support responsive layouts
* support loading states
* support empty states
* remain readable on mobile devices

Avoid overcrowding dashboards with too many charts.

---

# 37.5 Analytics Component Suggestions

Recommended reusable components:

```txt
AnalyticsCard
ChartCard
ProgressAnalytics
QuizAnalytics
AssignmentAnalytics
```

Recommended class naming:

```txt
analytics-card
analytics-chart
analytics-grid
analytics-summary
```

# 37.6 Analytics Visibility Rules

Analytics visibility must follow role permissions.

---

## Admin

Admin can view:

* platform-wide analytics
* all course analytics
* all instructor analytics
* all student analytics

Examples:

```txt
overall course completion
total quiz performance
system-wide assignment activity
```

---

## Instructor

Instructor can only view analytics for their own courses.

Instructor can view:

* student progress within owned courses
* quiz analytics within owned courses
* assignment analytics within owned courses

Instructor cannot view analytics from courses owned by other instructors.

Examples:

```txt
course completion rate
lesson completion rate
quiz average score
assignment submission status
```

---

## Student

Student can only view their own analytics.

Student can view:

* personal course progress
* personal quiz scores
* personal assignment status

Student cannot view:

* other student analytics
* instructor analytics
* system-wide analytics

Examples:

```txt
my completion rate
my quiz attempts
my assignment submissions
```

---

## Authorization Rules

Analytics APIs must use authorization checks.

Examples:

```txt
ADMIN:
- can access all analytics endpoints

INSTRUCTOR:
- can access analytics only for owned courses

STUDENT:
- can access only personal analytics
```

Unauthorized access must return:

```txt
403 Forbidden
```

