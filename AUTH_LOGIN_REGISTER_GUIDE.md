# AUTH_LOGIN_REGISTER_GUIDE.md

# 1. Authentication UI Purpose

The LMS must have two separate authentication UI flows:

* Admin Authentication
* Client Authentication

Client includes:

* Instructor
* Student

Admin authentication UI and Client authentication UI must be separated.

---

# 2. Authentication Folder Structure

Recommended frontend structure:

```txt
src/
  components/

    admin/
      auth/

        login/
          AdminLoginForm.tsx
          AdminLoginForm.scss
          index.ts

    client/
      auth/

        login/
          ClientLoginForm.tsx
          ClientLoginForm.scss
          index.ts

        register/
          ClientRegisterForm.tsx
          ClientRegisterForm.scss
          index.ts
```

---

# 3. Authentication Page Structure

Recommended pages:

```txt
src/
  pages/

    admin/
      auth/
        AdminLoginPage.tsx

    client/
      auth/
        ClientLoginPage.tsx
        ClientRegisterPage.tsx
```

Pages should import reusable auth components instead of containing large authentication logic directly.

---

# 4. Route Structure

Recommended routes:

```txt
/admin/login
/login
/register
```

Meaning:

```txt
/admin/login  → Admin login only
/login        → Student and Instructor login
/register     → Student registration
```

Do not create public:

```txt
/admin/register
```

---

# 5. Admin Authentication Rules

Admin authentication must be separated from client authentication.

Admin login rules:

* only allow users with `ADMIN` role
* redirect to `/admin/dashboard`
* reject `STUDENT`
* reject `INSTRUCTOR`
* use Admin UI style
* use admin layout conventions

Admin accounts should only be created by:

* seed scripts
* existing admins
* protected admin management pages

Admin registration must not be public.

---

# 6. Client Authentication Rules

Client authentication is used for:

* Student
* Instructor

Client login rules:

* allow `STUDENT`
* allow `INSTRUCTOR`
* redirect based on role

Redirect rules:

```txt
STUDENT    → /student/dashboard
INSTRUCTOR → /instructor/dashboard
ADMIN      → /admin/dashboard
```

Client registration rules:

* public registration creates `STUDENT`
* instructor accounts are created by admin only

Default registration role:

```txt
STUDENT
```

---

# 7. Shared Backend Authentication APIs

Frontend UI is separated, but backend authentication APIs may remain shared.

Recommended endpoints:

```txt
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
```

Frontend should check returned user role after login.

---

# 8. Authentication Response Example

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "user_id",
      "email": "admin@example.com",
      "fullName": "Admin User",
      "role": "ADMIN"
    },
    "accessToken": "jwt_access_token"
  }
}
```

---

# 9. Authentication Redirect Rules

After successful login:

```txt
ADMIN      → /admin/dashboard
INSTRUCTOR → /instructor/dashboard
STUDENT    → /student/dashboard
```

Unauthorized access must redirect to the appropriate login page.

---

# 10. Admin Login UI Rules

Admin authentication UI should feel:

* professional
* secure
* clean
* minimal

Recommended class names:

```txt
admin-auth-page
admin-auth-page__card
admin-auth-page__title
admin-auth-page__subtitle

admin-auth-form
admin-auth-form__field
admin-auth-form__actions
```

Admin login page should contain:

* email input
* password input
* login button
* loading state
* validation messages
* error alerts

Optional:

* remember me
* forgot password

---

# 11. Client Login/Register UI Rules

Client authentication UI should feel:

* friendly
* modern
* learning-focused

Recommended class names:

```txt
client-auth-page
client-auth-page__hero
client-auth-page__card
client-auth-page__title
client-auth-page__subtitle

client-auth-form
client-auth-form__field
client-auth-form__actions
```

Client login page should contain:

* email input
* password input
* login button
* forgot password link
* register link
* loading state
* validation messages
* error alerts

Client register page should contain:

* full name
* email
* password
* confirm password
* submit button
* login link

---

# 12. Recommended Authentication Components

Recommended reusable components:

```txt
AdminLoginForm
ClientLoginForm
ClientRegisterForm

AuthErrorAlert
PasswordInput
RememberMeCheckbox
```

---

# 13. Recommended Authentication Hooks

Recommended hooks:

```txt
useAdminLogin
useClientLogin
useClientRegister
useLogout
useRefreshToken
```

Hooks should contain:

* API logic
* loading state
* error handling
* token management

---

# 14. Authentication Context Rules

Recommended shared context:

```txt
AuthContext
```

Auth context should store:

```txt
user
role
accessToken
isAuthenticated
isLoading
login
logout
refreshToken
```

---

# 15. Protected Route Rules

Use separated protected routes.

Recommended structure:

```txt
AdminProtectedRoute
InstructorProtectedRoute
StudentProtectedRoute
```

Access rules:

```txt
/admin/*       → ADMIN only
/instructor/*  → INSTRUCTOR only
/student/*     → STUDENT only
```

Unauthorized users must be redirected.

---

# 16. Authentication Styling Rules

Use:

* Ant Design Form
* Ant Design Input
* Ant Design Button
* Ant Design Alert
* Ant Design Checkbox
* Ant Design Card

Avoid:

* inline styles
* duplicated authentication forms
* duplicated validation logic

Authentication pages must support:

* loading state
* error state
* validation state
* responsive layout

---

# 17. Responsive Authentication Rules

Desktop:

```txt
Centered authentication card
Two-column auth hero layout optional
```

Tablet:

```txt
Reduced spacing
Compact authentication card
```

Mobile:

```txt
Single-column layout
Full-width inputs
Responsive buttons
```

Rules:

* avoid horizontal overflow
* maintain readable spacing
* ensure mobile-friendly touch targets

---

# 18. AI Agent Rules

AI coding agents must:

* keep Admin and Client authentication separated
* use shared backend auth APIs
* avoid duplicated auth logic
* use reusable auth components
* use meaningful BEM class names
* support responsive layouts
* support loading and error states
* avoid inline styles

Do not create independent authentication systems for Admin and Client.

Only the UI and routes are separated.

---

# 19. Final Goal

The LMS authentication system should:

* separate Admin and Client experiences
* keep backend authentication centralized
* maintain reusable frontend architecture
* support scalable role-based access
* remain responsive and maintainable
* provide consistent UX across authentication flows
