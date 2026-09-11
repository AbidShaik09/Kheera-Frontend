# Kheera Frontend Implementation Todo

## Required Foundation

- [x] [#66 Establish frontend workflow, theming rules, and documentation structure](https://github.com/AbidShaik09/Kheera-Frontend/issues/66)

Complete this before starting new screen work. Follow
`docs/engineering/ENGINEERING_STANDARDS.md` for issue-first delivery, branches,
tests, centralized themes, security, and PR review.

## Phase 1: Authentication Screens

The current login and register routes are placeholders. Build these before
feature screens because they are the entry point into the authenticated app.
Use the Penpot `Login Board` and `SignUp Board 1 / 3`, `SignUp Board 2 / 3`,
and `SignUp Board 3 / 3` frames for visual direction, while implementing with
the local token-based styling system.

### Implement login page and authentication service flow

- [ ] [#70 Implement login page and authentication service flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/70)

**Scope:** Replace the `/login` placeholder with a complete login experience
based on the Penpot `Login Board`.

**Backend APIs:** `POST /api/auth/login`, `GET /api/users/me`.

**Requirements:**

- Build a real login form with email and password fields, submit button,
  loading state, inline validation, backend error display, and links to signup
  and forgot-password flows.
- Keep HTTP calls out of the component. Add typed auth API/service methods that
  wrap `ApiService` and preserve the backend's raw JWT and raw error text
  contract.
- On successful login, store the token through `AuthService`, refresh login
  status when needed, and navigate to the dashboard.
- Use shared controls/components where practical and style with semantic tokens,
  Tailwind utilities, and the existing theme layer. Do not hardcode colors or
  spacing.
- Verify light mode, dark mode, keyboard navigation, focus states, mobile width,
  and desktop width.
- Add focused unit tests for component success, failure, validation, loading,
  and service integration behavior.

**Acceptance criteria:** A user can log in with the existing backend API and
reach the authenticated dashboard; invalid credentials produce a useful message
without losing form state.

### Implement signup page three-step registration flow

- [ ] [#71 Implement signup page three-step registration flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/71)

**Scope:** Replace the `/register` placeholder with the three-step signup flow
shown in Penpot `SignUp Board 1 / 3`, `SignUp Board 2 / 3`, and
`SignUp Board 3 / 3`.

**Backend APIs:** `POST /api/auth/signup-email`,
`POST /api/auth/otp-validation`, `POST /api/auth/signup`.

**Requirements:**

- Step 1 collects email and requests signup OTP.
- Step 2 collects OTP, validates it, and supports resend behavior through the
  existing signup-email endpoint.
- Step 3 collects name, password, and confirmation password, validates matching
  passwords client-side, completes signup, stores the returned JWT, and
  navigates to the dashboard.
- Keep form state, API calls, and auth state separated: components own view
  state, service methods own backend calls, and `AuthService` owns token/login
  state.
- Use accessible form labels, error messages, button states, and progress
  indication. Preserve entered email across steps.
- Use semantic design tokens, reusable components, responsive layout, and
  light/dark theme support.
- Add focused unit tests for each step, validation rules, success flow, backend
  failure messages, and resend behavior.

**Acceptance criteria:** A new user can request an OTP, validate it, create an
account, receive a token, and land in the authenticated dashboard using the
existing backend APIs.

### Implement forgot-password and reset-password flow

- [ ] [#72 Implement forgot-password and reset-password flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/72)

**Scope:** Add the missing forgot-password/reset-password user experience and
route it from the login page.

**Backend APIs:** `POST /api/auth/forgot-password`,
`POST /api/auth/otp-validation`, `POST /api/auth/reset-password`.

**Requirements:**

- Add a forgot-password route/page or nested auth flow reachable from `/login`.
- Collect email, request password-reset OTP, collect OTP, collect new password
  and confirmation password, then submit the reset request.
- On successful reset, store the returned JWT through `AuthService` and navigate
  to the dashboard, or explicitly document if the chosen UX returns the user to
  login instead.
- Keep backend integration in service methods, not page components.
- Show generic email-sent messaging so the UI does not reveal whether an
  account exists.
- Use accessible forms, focus management between steps, keyboard support,
  loading states, retry/resend affordance, and responsive token-based styling.
- Add unit tests for request OTP, invalid/expired OTP, password mismatch,
  successful reset, service failures, and navigation behavior.

**Acceptance criteria:** A user who forgot their password can complete the
existing backend reset flow without using Swagger or manual API calls.

## Current Delivery Order

1. [#70 Implement login page and authentication service flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/70)
2. [#71 Implement signup page three-step registration flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/71)
3. [#72 Implement forgot-password and reset-password flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/72)
4. [#63 Implement Space Details route and data flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/63)
5. [#64 Implement Project Board experience](https://github.com/AbidShaik09/Kheera-Frontend/issues/64)
6. [#65 Implement Task Details experience](https://github.com/AbidShaik09/Kheera-Frontend/issues/65)

Start each item only when its backend contract is implemented or explicitly
mocked behind a documented frontend adapter. Keep the issue status and this
file aligned as work moves from planned to in progress to done.
