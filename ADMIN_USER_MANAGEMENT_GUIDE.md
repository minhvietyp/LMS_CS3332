# ADMIN_USER_MANAGEMENT_GUIDE.md

# 1. Module Overview

Admin User Management is responsible for managing LMS users.

This module is only for:

- ADMIN

The module must support:

- Create user
- Read user
- Update user
- Soft delete user
- Restore user
- Search users
- Filter users
- Paginated user list

---

# 2. Current Project Status

## Backend Status

Backend is mostly completed.

Implemented routes:

```txt
GET    /users
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id
POST   /users/:id/restore
```

Implemented features:

- list users
- get user by id
- create user
- update user
- soft delete user
- restore user

Backend files:

```txt
be/src/routes/user.routes.ts
be/src/services/user.service.ts
```

---

## Frontend Status

Frontend is NOT full CRUD yet.

Currently implemented:

- user list
- change role
- soft delete
- restore user

Current frontend API methods:

```ts
listUsersRequest()
updateUserRequest()
softDeleteUserRequest()
restoreUserRequest()
```

Frontend files:

```txt
fe/src/components/admin/users/index.tsx
fe/src/services/authApi.ts
```

---

# 3. Missing Features

The frontend still lacks:

- create user flow
- user detail page
- full edit form
- search
- filters
- pagination
- complete admin CRUD tests

---

# 4. User Entity Scope

Only use fields already defined inside the LMS project.

Allowed fields:

```txt
id
fullName
email
avatarUrl
role
status
isActive
lastLoginAt
createdAt
updatedAt
deletedAt
deletedBy
```

Do NOT add unrelated admin-template fields such as:

```txt
department
billing
finance
permissions matrix
```

unless they officially exist in backend schema.

---

# 5. Required Admin Pages

## 5.1 User List Page

Route:

```txt
/admin/users
```

Purpose:

- display all users
- search users
- filter users
- paginate users
- manage users

Features:

- search input
- role filter
- status filter
- pagination
- row actions
- loading state
- empty state

Recommended columns:

```txt
Avatar
Name
Email
Role
Status
Last Login
Actions
```

Actions:

```txt
View
Edit
Delete
Restore
```

---

## 5.2 User Detail Page

Route:

```txt
/admin/users/:id
```

Purpose:

- display complete user information

Required UI:

```txt
Avatar
Full Name
Email
Role
Status
Created Date
Updated Date
Last Login
Deleted Status
```

Actions:

```txt
Edit
Deactivate
Delete
Restore
```

---

## 5.3 Create User Page

Route:

```txt
/admin/users/create
```

Purpose:

- create instructor/student/admin accounts

Required fields:

```txt
fullName
email
password
role
status
avatarUrl
```

Validation rules:

- email required
- email unique
- password required
- role required
- fullName required

---

## 5.4 Edit User Page

Route:

```txt
/admin/users/:id/edit
```

Purpose:

- update user information

Editable fields:

```txt
fullName
email
avatarUrl
role
status
```

Do NOT edit password here unless reset-password module exists.

---

# 6. CRUD Requirements

## Create

Frontend must implement:

```ts
createUserRequest()
```

Required UI:

- create form
- validation
- loading button
- success toast
- error handling

---

## Read

Frontend must implement:

```ts
getUserByIdRequest()
```

Required UI:

- detail page
- profile card
- metadata section

---

## Update

Current update only partially edits role/status.

Need full update support for:

```txt
fullName
email
avatarUrl
role
status
```

---

## Delete

Use soft delete only.

Delete behavior:

```txt
deletedAt = current timestamp
deletedBy = admin id
```

Required UI:

- confirmation modal
- danger button
- success notification

---

## Restore

Restore should:

```txt
clear deletedAt
clear deletedBy
```

Required UI:

- restore button
- restore confirmation
- success feedback

---

# 7. Search + Filters

Current implementation:

```tsx
listUsersRequest(true)
```

This is incomplete.

Need:

- search input
- role filter
- status filter
- query sync
- debounce search

Example query:

```txt
/admin/users?search=john&role=INSTRUCTOR&status=ACTIVE
```

---

# 8. Pagination

Current implementation:

```tsx
pagination={false}
```

This is incomplete.

Need:

- backend pagination
- frontend pagination controls
- page size selector

Expected backend response:

```json
{
  "items": [],
  "page": 1,
  "limit": 10,
  "total": 120,
  "totalPages": 12
}
```

---

# 9. Recommended Frontend Structure

```txt
src/components/admin/users/

UserTable/
UserFilters/
UserSearch/
UserCreateForm/
UserEditForm/
UserDetailCard/
UserDeleteModal/
UserRestoreButton/
UserRoleBadge/
UserStatusBadge/
```

Recommended pages:

```txt
src/pages/admin/users/

UserListPage.tsx
UserDetailPage.tsx
UserCreatePage.tsx
UserEditPage.tsx
```

---

# 10. Recommended API Layer

File:

```txt
fe/src/services/authApi.ts
```

Need to add:

```ts
createUserRequest()
getUserByIdRequest()
```

Optional improvements:

```ts
searchUsersRequest()
paginateUsersRequest()
```

---

# 11. UI/UX Requirements

Use existing LMS Admin Design System.

Style should be:

- clean
- professional
- dashboard-oriented
- easy to scan

Recommended components:

```txt
Table
Form
Input
Select
Avatar
Tag
Dropdown
Modal
Pagination
Card
Button
```

---

# 12. Delete Confirmation Modal

Required modal:

```txt
Title:
Delete User

Message:
Are you sure you want to delete this user?

Buttons:
Cancel
Delete
```

Delete button must use danger style.

---

# 13. Authorization Rules

Only ADMIN can access:

```txt
/admin/users
/admin/users/create
/admin/users/:id
/admin/users/:id/edit
```

Required permission:

```txt
admin:users:manage
```

Unauthorized response:

```txt
403 Forbidden
```

---

# 14. Required States

Every admin user page must support:

- loading state
- empty state
- error state
- success state

Example empty state:

```txt
No users found.
Try adjusting your search or filters.
```

---

# 15. Responsive Requirements

## Desktop

- full table
- horizontal toolbar

## Tablet

- compact filters
- table scroll

## Mobile

- stacked filters
- dropdown actions
- horizontal table scroll

---

# 16. Required Testing

Current test coverage is incomplete.

Need backend tests for:

```txt
POST   /users
PATCH  /users/:id
DELETE /users/:id
POST   /users/:id/restore
GET    /users/:id
```

Need frontend tests for:

- create user flow
- edit user flow
- delete modal
- restore flow
- pagination
- filters
- search

---

# 17. Recommended Development Priority

## Priority 1

Critical CRUD completion:

- create user
- user detail page
- full edit form

## Priority 2

Admin UX completion:

- search
- filters
- pagination

## Priority 3

Advanced improvements:

- optimistic UI
- audit logs
- activity tracking

---

# 18. Real Completion Status

## Backend

Approximately:

```txt
85–90% complete
```

## Frontend

Approximately:

```txt
45–55% complete
```

## Overall User Management

Status:

```txt
PARTIALLY COMPLETED
NOT FULL CRUD YET
```

---

# 19. AI Agent Rules

When implementing this module, AI agents must:

- use existing LMS design system
- avoid unrelated admin-template fields
- only use project-approved schema
- implement real CRUD flows
- support soft delete + restore
- include validation
- include loading/error states
- protect admin routes
- support pagination/search/filter
- avoid hardcoded fake data