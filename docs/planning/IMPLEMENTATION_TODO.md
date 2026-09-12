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

- [x] [#70 Implement login page and authentication service flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/70)

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

**Implementation notes:** `/login` is implemented with backend-backed password
login through `AuthService`, raw-text JWT handling through `ApiService.postText`,
token storage, route navigation, backend error display, form validation,
loading state, and links to signup and forgot-password flows. Unit coverage
verifies validation, success, backend errors, and loading behavior.

### Implement signup page three-step registration flow

- [x] [#71 Implement signup page three-step registration flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/71)

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

**Implementation notes:** The signup flow is implemented on `/register` as a
three-step standalone Angular component. Auth calls remain in `AuthService`,
which uses `ApiService.postText` for raw backend string contracts including OTP
status messages and JWT responses. Unit coverage verifies validation, backend
success/error messages, resend behavior, account creation, token storage, and
navigation.

### Implement forgot-password and reset-password flow

- [x] [#72 Implement forgot-password and reset-password flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/72)

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

**Implementation notes:** `/forgot-password` is implemented as a standalone
Angular page linked from login. It requests reset OTPs through `AuthService`,
uses the raw-text backend response contract, validates OTP and matching
passwords locally, stores the returned JWT on successful reset, and navigates to
the dashboard. Unit coverage verifies validation, backend success/error
messages, resend behavior, token flow, and navigation.

## Completed Legacy Authentication Issues

The following older auth issues are implemented on `develop` by the login,
signup, forgot-password, auth service, routing, and unit-test work tracked
above. Keep them closed rather than planning duplicate work:

- [#4 Add routing and authentication Pages](https://github.com/AbidShaik09/Kheera-Frontend/issues/4)
- [#24 Create Signup Email Screen UI](https://github.com/AbidShaik09/Kheera-Frontend/issues/24)
- [#25 Integrate Signup Email API](https://github.com/AbidShaik09/Kheera-Frontend/issues/25)
- [#26 Create OTP Verification Screen UI](https://github.com/AbidShaik09/Kheera-Frontend/issues/26)
- [#27 Integrate OTP Validation API](https://github.com/AbidShaik09/Kheera-Frontend/issues/27)
- [#28 Create Account Creation Screen UI](https://github.com/AbidShaik09/Kheera-Frontend/issues/28)
- [#29 Integrate Final Signup API](https://github.com/AbidShaik09/Kheera-Frontend/issues/29)
- [#31 Improve Authentication User Experience](https://github.com/AbidShaik09/Kheera-Frontend/issues/31)
- [#68 Add unit tests for existing frontend features](https://github.com/AbidShaik09/Kheera-Frontend/issues/68)
- [#69 Repair Angular unit-test runner and existing spec compilation errors](https://github.com/AbidShaik09/Kheera-Frontend/issues/69)

## Phase 2: Landing And Dashboard Foundation

### Create Kheera landing page

- [ ] [#5 Create a kheera landing page](https://github.com/AbidShaik09/Kheera-Frontend/issues/5)

**Scope:** Add a public landing page based on the linked Penpot reference so
first-time visitors understand Kheera before entering the authenticated app.

**Requirements:**

- Inspect the linked Penpot board before implementation.
- Use real product assets from `public/` where available.
- Present what Kheera is, key value, feature highlights, and clear calls to
  login/signup.
- Keep the route public and responsive across mobile and desktop.
- Add focused unit tests for routing/rendering behavior.

### Complete Home Task component

- [ ] [#37 Create Home-Task-Component](https://github.com/AbidShaik09/Kheera-Frontend/issues/37)

**Scope:** Finish the reusable dashboard task item component to match the
documented component API and Penpot design.

**Requirements:**

- Honor the issue's input/output contract, including status-driven icons,
  relative timestamp display, clickable state, truncation, and stable height.
- Keep the component presentational with no modal or navigation logic.
- Expand unit tests beyond creation to cover rendering, click emission,
  non-clickable behavior, status icon behavior, and relative time formatting.

### Create dashboard page sections

- [ ] [#60 Create Dashboard Page Sections](https://github.com/AbidShaik09/Kheera-Frontend/issues/60)

**Scope:** Replace the current placeholder dashboard layout with the planned
sectioned dashboard structure.

**Requirements:**

- Implement left activity/favourites/spaces sections, main task sections for
  recently visited, last month, and earlier tasks, plus the right focus area.
- Preserve the planned grid proportions and minimal scroll behavior.
- Leave the calendar as a filler area until its standalone story is ready.
- Add responsive behavior and unit tests for section rendering.

## Phase 3: API-Backed Workspaces

### Implement Space Details route and data flow

- [ ] [#63 Implement Space Details route and data flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/63)

**Scope:** Add a protected `/spaces/:spaceId` route that renders a selected
space and its projects from live API data.

**Requirements:**

- Follow the Penpot Space Details board and established navigation shell.
- Integrate the space detail and project summary API contracts.
- Provide loading, empty, forbidden, and recoverable-error states.
- Link project cards to `/projects/:projectId`.
- Add route/component/service unit tests.

### Build Project Details board with API-backed task states

- [ ] [#64 Build Project Details board with API-backed task states](https://github.com/AbidShaik09/Kheera-Frontend/issues/64)

**Scope:** Add a protected `/projects/:projectId` route with project summary,
task columns, epic grouping, and activity based on backend project/work-item
contracts.

**Requirements:**

- Wait for the backend workflow-stage contract before implementing mutable board
  movement.
- Render project header, progress, task counts, ordered stage columns, epic
  groups, and task cards from API data.
- Support task navigation and create action.
- Include loading, empty, forbidden, and error states.
- Add rollback behavior before enabling optimistic drag/drop.

### Implement Task Details route, editing, comments, and attachments

- [ ] [#65 Implement Task Details route, editing, comments, and attachments](https://github.com/AbidShaik09/Kheera-Frontend/issues/65)

**Scope:** Add a protected `/work-items/:workItemId` route for direct-linkable
task details, editing, comments, and attachments.

**Requirements:**

- Render editable title, description, type, assignee, dates, effort, parent,
  sprint, and stage metadata from API data.
- Persist edits through the work-item PATCH contract and refresh upstream views
  safely.
- Integrate comments and task/comment attachment APIs.
- Provide loading, not-found, forbidden, field validation, mutation rollback,
  upload pending/success/failure, and removal states.

## Current Delivery Order

1. [#5 Create a kheera landing page](https://github.com/AbidShaik09/Kheera-Frontend/issues/5)
2. [#37 Create Home-Task-Component](https://github.com/AbidShaik09/Kheera-Frontend/issues/37)
3. [#60 Create Dashboard Page Sections](https://github.com/AbidShaik09/Kheera-Frontend/issues/60)
4. [#63 Implement Space Details route and data flow](https://github.com/AbidShaik09/Kheera-Frontend/issues/63)
5. [#64 Implement Project Board experience](https://github.com/AbidShaik09/Kheera-Frontend/issues/64)
6. [#65 Implement Task Details experience](https://github.com/AbidShaik09/Kheera-Frontend/issues/65)

Start each item only when its backend contract is implemented or explicitly
mocked behind a documented frontend adapter. Keep the issue status and this
file aligned as work moves from planned to in progress to done.
