# CLIENT_LAYOUT_DECISIONS_UPDATE.md

# 1. Final Client Layout Architecture

The LMS must use one shared Client Layout for both:

* Student
* Instructor

The layout should render different navigation items based on the user role.

Recommended structure:

```txt
ClientLayout
  ClientSidebar
  ClientMain
    ClientHeader
    ClientPageContainer
```

Recommended HTML structure:

```txt
div.client-layout
  aside.client-sidebar
  main.client-main
    header.client-header
    section.client-page
```

The Client Layout should support:

* shared visual identity
* dynamic role-based menu
* fixed sidebar
* global top header
* responsive behavior
* reusable page structure

Do not create completely separate layouts for Student and Instructor.

---

# 2. Client Layout Folder Location

All shared client layout components must be placed inside:

```txt
src/components/client/layout/
```

Recommended structure:

```txt
src/
  components/
    client/
      layout/

        ClientLayout/
          index.tsx
          ClientLayout.scss

        ClientSidebar/
          index.tsx
          ClientSidebar.scss

        ClientHeader/
          index.tsx
          ClientHeader.scss

        ClientPageContainer/
          index.tsx
          ClientPageContainer.scss

        ClientDashboardHero/
          index.tsx
          ClientDashboardHero.scss

        ClientRoleMenu/
          index.tsx
          clientMenu.config.ts

        LessonLearningLayout/
          index.tsx
          LessonLearningLayout.scss
```

Do not place shared client layout components directly inside:

```txt
src/components/client/
src/pages/
src/layouts/
```

All reusable client layout components must remain centralized inside:

```txt
src/components/client/layout/
```

---

# 3. Shared Dashboard Hero

Student and Instructor must use one shared dashboard hero component.

Recommended component:

```txt
ClientDashboardHero
```

The component should render different data depending on role.

---

## Student Hero Examples

Student dashboard hero may display:

* welcome message
* enrolled courses
* active courses
* completed courses
* current learning progress
* next lesson

---

## Instructor Hero Examples

Instructor dashboard hero may display:

* welcome message
* my courses
* total students
* active courses
* pending submissions
* course analytics summary

---

# 4. Sidebar Layout Rules

The Client Layout must use a fixed left sidebar.

Sidebar behavior:

```txt
Desktop:
- fixed sidebar
- always visible

Tablet:
- fixed sidebar with reduced spacing

Mobile:
- drawer overlay sidebar
```

The sidebar should NOT collapse into icon-only mode.

Sidebar must support:

* active route highlight
* grouped menu sections
* nested submenu
* role-based rendering
* logout action

Recommended class names:

```txt
client-sidebar
client-sidebar__user
client-sidebar__welcome
client-sidebar__nav
client-sidebar__section
client-sidebar__section-title
client-sidebar__item
client-sidebar__item--active
client-sidebar__submenu
client-sidebar__logout
```

---

# 5. Dynamic Role-Based Menu

Sidebar menu items must render dynamically based on role.

Roles:

```txt
STUDENT
INSTRUCTOR
```

---

## Student Menu Example

```txt
Dashboard

Learning
  - Enrolled Courses
  - My Progress
  - Quiz Attempts
  - Assignments

Communication
  - Notifications
  - Course Chat

User
  - Profile
  - Settings
  - Logout
```

---

## Instructor Menu Example

```txt
Dashboard

Courses
  - My Courses
  - Create Course
  - Lessons

Teaching
  - Students
  - Assignments
  - Quiz Attempts
  - Analytics

Communication
  - Announcements
  - Notifications
  - Course Chat

User
  - Profile
  - Settings
  - Logout
```

Student must not see instructor-only menu items.

---

# 6. Client Dashboard Card Style

Client dashboard must use pastel statistic cards.

Recommended pastel colors:

```txt
Soft Blue
Soft Purple
Soft Pink
Soft Coral
Soft Orange
Soft Green
```

Cards should feel:

* friendly
* soft
* modern
* visual
* learning-focused

Recommended class names:

```txt
client-stat-card
client-stat-card--blue
client-stat-card--purple
client-stat-card--pink
client-stat-card--coral
client-stat-card--orange
client-stat-card--green
```

---

# 7. Client Content Width Rules

Client pages should use centered content layout.

Recommended max width:

```txt
1280px
```

Recommended structure:

```txt
main.client-page
  div.client-page__inner
```

Rules:

* keep content centered
* avoid stretched full-width content
* maintain readable spacing
* use responsive page padding

Recommended spacing:

```txt
Desktop:
- 40px 24px

Tablet:
- 32px 20px

Mobile:
- 24px 16px
```

---

# 8. Lesson Learning Layout

Normal client pages should use:

```txt
ClientLayout
```

Lesson learning pages must use a dedicated fullscreen learning layout.

Recommended layout:

```txt
LessonLearningLayout
```

Purpose:

* reduce distraction
* maximize lesson space
* improve learning experience
* support video learning
* support lesson navigation

Recommended structure:

```txt
LessonLearningLayout
  LessonTopBar
  LessonSidebar
  LessonContent
  LessonActionPanel
```

Use this layout for:

* lesson viewer
* video lesson page
* reading lesson page
* quiz learning page

---

# 9. Notification System Rules

Notifications should exist in BOTH:

```txt
Header notification dropdown
Dedicated notification page
```

---

## Header Notification Dropdown

The header dropdown should display:

* unread notifications
* latest notifications
* notification type icon
* short notification message
* relative time
* View All action

Recommended class names:

```txt
client-notification-dropdown
client-notification-dropdown__header
client-notification-dropdown__item
client-notification-dropdown__icon
client-notification-dropdown__content
client-notification-dropdown__time
client-notification-dropdown__view-all
```

---

## Notification Page

The notification page should support:

* all notifications
* read/unread state
* filters
* pagination
* mark as read action

Recommended class names:

```txt
client-notifications-page
client-notifications-page__filters
client-notifications-page__list
client-notifications-page__item
client-notifications-page__pagination
```

---

# 10. Course-Based Chat System

The LMS should use course-based chat panels.

Recommended behavior:

* each course has its own chat
* instructor and enrolled students can communicate
* chat is connected to the course context
* chat is accessible from course detail and lesson pages

Recommended component:

```txt
CourseChatPanel
```

Recommended structure:

```txt
CourseChatPanel
  ChatHeader
  ChatMessages
  ChatInput
```

Recommended class names:

```txt
course-chat-panel
course-chat-panel__header
course-chat-panel__messages
course-chat-panel__message
course-chat-panel__input
```

---

# 11. Instructor Visual Style Rules

Instructor pages must fully use Client UI style.

Do not use Admin visual style for instructor pages.

Instructor pages should still feel:

* friendly
* modern
* visual
* learning-focused

Examples:

* My Courses
* Create Course
* Lesson Builder
* Assignment Management
* Quiz Management
* Student Progress

Instructor pages may contain management features, but the visual design must remain client-style.

Use:

* client cards
* client forms
* pastel cards
* light backgrounds
* course-focused layouts
* soft visual hierarchy

Avoid:

* dense admin dashboard styling
* heavy admin tables
* system-control feeling

---

# 12. Client Header Rules

The Client Layout must use a global top header.

Header should contain:

* sidebar toggle for mobile
* search input
* notification dropdown
* language switcher
* user avatar
* dropdown menu

Optional:

* continue learning button
* create course button for instructor

Recommended class names:

```txt
client-header
client-header__left
client-header__search
client-header__right
client-header__notification
client-header__avatar
client-header__dropdown
```

---

# 13. Client Responsive Rules

## Desktop

```txt
Fixed sidebar
Global header
Multi-column content
```

---

## Tablet

```txt
Reduced spacing
Two-column content grid
Compact header
```

---

## Mobile

```txt
Drawer sidebar
Single-column layout
Responsive cards
Horizontal table scroll
```

Rules:

* avoid horizontal overflow
* maintain readable text
* use touch-friendly buttons
* stack content vertically
* make cards full width on mobile

---

# 14. Recommended Client Components

Recommended reusable components:

```txt
ClientLayout
ClientSidebar
ClientHeader
ClientPageContainer
ClientDashboardHero

ClientStatCard
ClientCourseCard
ClientProgressCard
ClientNotificationDropdown
ClientNotificationItem

CourseChatPanel
LessonLearningLayout
```

---

# 15. AI Agent Rules

When generating Student or Instructor pages, AI coding agents must:

* use shared ClientLayout
* render sidebar dynamically by role
* use fixed sidebar structure
* support nested submenu
* use ClientPageContainer
* use meaningful BEM class names
* avoid inline styles
* avoid duplicated sidebar/header code
* use Ant Design components where appropriate
* support responsive layouts
* include loading states
* include empty states
* include error states

Do not create separate layouts for Student and Instructor unless explicitly required.

---

# 16. Final Goal

The Client Layout should make Student and Instructor pages feel like one connected learning platform.

The final experience should feel:

* modern
* friendly
* learning-focused
* visually consistent
* scalable
* maintainable
* responsive

The layout should support future expansion without major restructuring.
