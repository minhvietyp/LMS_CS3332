# LMS_RBAC_PERMISSION_SYSTEM_GUIDE.md

# LMS Role-Based Access Control (RBAC) System Guide

## 1. Overview

The university LMS system should use:

```txt
RBAC (Role-Based Access Control)
```

combined with:

```txt
Ownership-based authorization
```

Goals:

* control permissions by role
* separate responsibilities clearly
* prevent unauthorized access
* support future scalability

---

# 2. Final Role Design

The project uses 3 main roles:

```txt
ADMIN
INSTRUCTOR
STUDENT
```

---

# 3. Role Definitions

## ADMIN

Represents:

```txt
University management staff / system administrator
```

Responsibilities:

* manage the entire system
* manage academic operations
* manage users
* oversee courses
* view system-wide analytics

---

## INSTRUCTOR

Represents:

```txt
Lecturer / teacher
```

Responsibilities:

* create courses
* manage lessons
* create quizzes
* create assignments
* grade submissions
* monitor student progress

---

## STUDENT

Represents:

```txt
University student
```

Responsibilities:

* access enrolled courses
* view lessons
* take quizzes
* submit assignments
* track personal learning progress

---

# 4. Authorization Strategy

The system should use:

```txt
RBAC + Ownership Rule
```

Examples:

* Instructors can only modify their own courses
* Students can only view their own progress
* Admins can access the entire system

---

# 5. Permission Structure

## Recommended Permission Naming

```txt
module:action
```

Examples:

```txt
user:create
user:update
course:create
course:update
quiz:create
assignment:grade
report:view
```

---

# 6. Permission Matrix

| Permission        | ADMIN | INSTRUCTOR   | STUDENT    |
| ----------------- | ----- | ------------ | ---------- |
| user:list         | ✅     | ❌            | ❌          |
| user:get          | ✅     | ❌            | ❌          |
| user:create       | ✅     | ❌            | ❌          |
| user:update       | ✅     | ❌            | ❌          |
| user:delete       | ✅     | ❌            | ❌          |
| user:restore      | ✅     | ❌            | ❌          |
| course:list       | ✅ all | ✅ own        | ✅ enrolled |
| course:get        | ✅     | ✅ own        | ✅ enrolled |
| course:create     | ✅     | ✅            | ❌          |
| course:update     | ✅ all | ✅ own        | ❌          |
| course:publish    | ✅     | ✅ own        | ❌          |
| course:archive    | ✅     | ✅ own        | ❌          |
| module:create     | ✅     | ✅ own        | ❌          |
| lesson:create     | ✅     | ✅ own        | ❌          |
| lesson:update     | ✅     | ✅ own        | ❌          |
| lesson:view       | ✅     | ✅            | ✅ enrolled |
| enrollment:create | ✅     | ✅ own course | ❌          |
| enrollment:delete | ✅     | ✅ own course | ❌          |
| progress:view     | ✅ all | ✅ own course | ✅ self     |
| quiz:create       | ✅     | ✅ own course | ❌          |
| quiz:update       | ✅     | ✅ own course | ❌          |
| quiz:submit       | ❌     | ❌            | ✅          |
| assignment:create | ✅     | ✅ own course | ❌          |
| assignment:grade  | ✅     | ✅ own course | ❌          |
| assignment:submit | ❌     | ❌            | ✅          |
| report:view       | ✅ all | ✅ own course | ✅ self     |
| notification:view | ✅     | ✅            | ✅          |
| chat:send         | ✅     | ✅            | ✅          |

---

# 7. Ownership Rules

## Instructor Ownership

Instructors can only manage:

* courses they own
* lessons inside owned courses
* quizzes inside owned courses
* assignments inside owned courses

Example:

```ts
if (course.instructorId !== req.user.id) {
  throw new ForbiddenError();
}
```

---

## Student Ownership

Students can only:

* view their own progress
* view their own submissions
* view their own quiz attempts

Example:

```ts
if (submission.studentId !== req.user.id) {
  throw new ForbiddenError();
}
```

---

# 8. Recommended Backend Structure

## permissions/

```txt
src/modules/
  auth/
    permissions/
      permission.constants.ts
      role-permission.map.ts
```

---

# 9. Permission Constants

## permission.constants.ts

```ts
export const PERMISSIONS = {
  USER_CREATE: "user:create",
  USER_UPDATE: "user:update",
  USER_DELETE: "user:delete",

  COURSE_CREATE: "course:create",
  COURSE_UPDATE: "course:update",

  QUIZ_CREATE: "quiz:create",
  QUIZ_SUBMIT: "quiz:submit",

  ASSIGNMENT_GRADE: "assignment:grade",
};
```

---

# 10. Role Permission Map

## role-permission.map.ts

```ts
import { Role } from "@prisma/client";

export const ROLE_PERMISSIONS = {
  ADMIN: [
    "user:create",
    "user:update",
    "course:create",
    "report:view",
  ],

  INSTRUCTOR: [
    "course:create",
    "course:update",
    "quiz:create",
    "assignment:grade",
  ],

  STUDENT: [
    "quiz:submit",
    "assignment:submit",
  ],
};
```

---

# 11. Authorize Middleware

## authorize.ts

```ts
export const authorize =
  (...permissions: string[]) =>
  (req, res, next) => {
    const userPermissions =
      ROLE_PERMISSIONS[req.user.role];

    const hasPermission = permissions.some((p) =>
      userPermissions.includes(p)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    next();
  };
```

---

# 12. Route Usage Examples

## Admin-only Route

```ts
router.post(
  "/users",
  authenticate,
  authorize("user:create"),
  userController.createUser
);
```

---

## Instructor Route

```ts
router.post(
  "/courses",
  authenticate,
  authorize("course:create"),
  courseController.createCourse
);
```

---

# 13. Frontend RBAC Rules

Frontend should:

* hide unauthorized menus
* block unauthorized routes
* hide unauthorized action buttons

Example:

```tsx
{hasPermission("user:create") && (
  <Button>Create User</Button>
)}
```

---

# 14. Sidebar Permission Rules

## ADMIN Sidebar

```txt
Dashboard
Users
Courses
Reports
Notifications
Settings
```

---

## INSTRUCTOR Sidebar

```txt
Dashboard
My Courses
Assignments
Quizzes
Students
Notifications
```

---

## STUDENT Sidebar

```txt
Dashboard
My Courses
Assignments
Quizzes
Progress
Notifications
```

---

# 15. Analytics Visibility Rules

## ADMIN

Can view:

* all analytics
* all course reports
* all student reports

---

## INSTRUCTOR

Can only view:

* analytics for owned courses

---

## STUDENT

Can only view:

* personal analytics

---

# 16. API Security Rules

Backend must always verify:

```txt
JWT authentication
+
Role permission
+
Ownership validation
```

Never rely only on frontend validation.

---

# 17. Recommended Prisma Role Enum

```prisma
enum Role {
  ADMIN
  INSTRUCTOR
  STUDENT
}
```

---

# 18. Recommended User Fields

```prisma
model User {
  id        String
  name      String
  email     String
  password  String

  role      Role

  isActive  Boolean

  createdAt DateTime
  updatedAt DateTime
  deletedAt DateTime?
}
```

---

# 19. Recommended Future Expansion

The system can later support:

```txt
TEACHING_ASSISTANT
DEPARTMENT_MANAGER
SUPER_ADMIN
```

However, version 1 should only use:

```txt
ADMIN
INSTRUCTOR
STUDENT
```

to avoid over-engineering.

---

# 20. Final Recommended Authorization Architecture

```txt
Authentication
  ↓
RBAC Permission Check
  ↓
Ownership Validation
  ↓
Business Logic
```

This is the most suitable architecture for a medium-scale university LMS.
