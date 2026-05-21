# ADMIN_LAYOUT_GUIDE.md

# 1. Admin Layout Purpose

The LMS must use one shared Admin Layout for all admin pages.

The Admin Layout is responsible for:

* sidebar
* header
* breadcrumb
* page spacing
* responsive behavior
* layout consistency

All admin pages must reuse this layout.

Do not recreate sidebar or header inside individual admin pages.

---

# 2. Admin Layout Location

The Admin Layout must be placed inside:

```txt
src/components/admin/layout/
```

Recommended structure:

```txt
src/
  components/
    admin/

      layout/
        AdminLayout/
          index.tsx
          AdminLayout.scss

        AdminSidebar/
          index.tsx
          AdminSidebar.scss

        AdminHeader/
          index.tsx
          AdminHeader.scss

        AdminBreadcrumb/
          index.tsx
          AdminBreadcrumb.scss

        AdminPageContainer/
          index.tsx
          AdminPageContainer.scss
```

---

# 3. Admin Layout Architecture

Recommended structure:

```txt
AdminLayout
  AdminSidebar
  AdminMain
    AdminHeader
    AdminBreadcrumb
    AdminPageContainer
```

Recommended HTML structure:

```txt
div.admin-layout
  aside.admin-sidebar
  main.admin-main
    header.admin-header
    div.admin-breadcrumb
    section.admin-page
```

---

# 4. Admin Layout Responsibilities

## AdminLayout

Responsible for:

* main admin structure
* sidebar integration
* header integration
* responsive layout
* page spacing
* route layout wrapper

---

## AdminSidebar

Responsible for:

* navigation menu
* active menu state
* responsive collapse
* mobile drawer
* user summary

---

## AdminHeader

Responsible for:

* sidebar toggle
* search
* notifications
* language switcher
* avatar dropdown

---

## AdminBreadcrumb

Responsible for:

* route breadcrumb
* current page hierarchy

---

## AdminPageContainer

Responsible for:

* page max width
* consistent padding
* page spacing
* page alignment

---

# 5. Sidebar Requirements

Sidebar should contain:

```txt
Dashboard
Analytics
User Management
Role & Permissions
Courses
Lessons
Enrollments
Reports
Notifications
Settings
```

Sidebar rules:

* use icons
* active route highlight
* fixed on desktop
* collapsible on tablet
* drawer overlay on mobile

Recommended class names:

```txt
admin-sidebar
admin-sidebar__logo
admin-sidebar__nav
admin-sidebar__item
admin-sidebar__item--active
admin-sidebar__footer
admin-sidebar__user
```

---

# 6. Header Requirements

Header should contain:

* sidebar toggle
* search input
* notification icon
* language switcher
* user avatar
* dropdown menu

Optional:

* fullscreen toggle
* quick action button

Recommended class names:

```txt
admin-header
admin-header__left
admin-header__right
admin-header__search
admin-header__notification
admin-header__avatar
admin-header__dropdown
```

---

# 7. Admin Page Structure

Every admin page should use:

```txt
AdminLayout
  AdminPageContainer
```

Recommended structure:

```txt
main.admin-page
  div.admin-page__inner
    header.admin-page__header
      div.admin-page__title-group
      div.admin-page__actions

    section.admin-page__content
```

---

# 8. Admin Dashboard Layout

Dashboard should include:

* summary cards
* analytics charts
* recent activity
* quick actions

Recommended sections:

```txt
DashboardSummaryCards
UserGrowthChart
CourseStatusChart
RecentActivities
QuickActions
```

Recommended grid:

```txt
section.admin-dashboard
  div.admin-dashboard__stats-grid
  div.admin-dashboard__charts-grid
  div.admin-dashboard__content-grid
```

---

# 9. Responsive Rules

## Desktop

```txt
Expanded sidebar
Full search bar
Multi-column layout
```

---

## Tablet

```txt
Collapsed sidebar
Compact header
Reduced spacing
```

---

## Mobile

```txt
Drawer sidebar
Icon-based actions
Single-column layout
Responsive tables
```

Rules:

* avoid horizontal overflow
* support responsive tables
* stack content vertically
* maintain readable spacing

---

# 10. Styling Rules

Use:

* background: #F4F5F7
* white cards
* border radius: 8px
* subtle shadows
* thin borders
* consistent spacing

Avoid:

* heavy gradients
* oversized cards
* inline styles
* duplicated layout code

---

# 11. Ant Design Usage

Use Ant Design for:

```txt
Layout
Menu
Drawer
Breadcrumb
Avatar
Dropdown
Badge
Input.Search
Button
Table
Card
Tag
Modal
Tooltip
```

Do not rebuild Ant Design components unnecessarily.

---

# 12. Reusable Admin Components

Recommended reusable components:

```txt
AdminCard
AdminTable
AdminToolbar
FilterBar
SearchInput
PaginationBar
StatusTag
ConfirmAction
AnalyticsCard
ChartCard
```

---

# 13. Recommended Class Naming

Use BEM naming:

```txt
admin-layout
admin-main

admin-sidebar
admin-sidebar__item
admin-sidebar__item--active

admin-header
admin-header__search

admin-page
admin-page__header
admin-page__content

admin-dashboard
admin-dashboard__stats-grid
```

---

# 14. AI Agent Rules

When generating admin pages, AI coding agents must:

* use shared AdminLayout
* use AdminPageContainer
* use meaningful BEM class names
* avoid inline styles
* avoid duplicate sidebar/header code
* use Ant Design components when appropriate
* support responsive behavior
* include loading states
* include error states
* include empty states

Do not create independent admin layouts inside pages.

---

# 15. Final Goal

The Admin Layout should ensure:

* all admin pages feel connected
* consistent navigation exists
* responsive behavior works correctly
* reusable structure reduces duplicated code
* future admin modules can be added easily

The Admin UI should feel:

* professional
* structured
* efficient
* scalable
* easy to maintain
