# Kheera Frontend Implementation Todo

## Reconciled Status (2026-09-13)

Checked against latest `develop`, GitHub issue states, and merged PRs. Only
#63, #64, and #65 remain open; all three still have missing routes/API flows.
Dashboard layout #60 is already closed and delivered by PR #79. Its data is
still hardcoded, and the calendar remains an intentional placeholder.
Follow the fresh-develop synchronization rule before any implementation or
documentation edits. New issue branches start only from verified latest develop.

## Required Foundation

- [x] [#66 Establish frontend workflow, theming rules, and documentation structure](https://github.com/AbidShaik09/Kheera-Frontend/issues/66)

Complete this before starting new screen work. Follow
`docs/engineering/ENGINEERING_STANDARDS.md` for issue-first delivery, branches,
tests, centralized themes, security, and PR review.

## Phase 1: Authentication Screens

Login, registration, and password reset are implemented. Keep the completed
requirements below as delivery history rather than new implementation work.
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

- [x] [#5 Create a kheera landing page](https://github.com/AbidShaik09/Kheera-Frontend/issues/5)

**Scope:** Add a public landing page based on the linked Penpot reference so
first-time visitors understand Kheera before entering the authenticated app.

**Requirements:**

- Inspect the linked Penpot board before implementation.
- Use real product assets from `public/` where available.
- Present what Kheera is, key value, feature highlights, and clear calls to
  login/signup.
- Keep the route public and responsive across mobile and desktop.
- Add focused unit tests for routing/rendering behavior.

**Implementation notes:** `/` is implemented as a public landing page with
Kheera branding, product value copy, workspace preview, signup/login calls to
action, responsive layout, and unit coverage. The authenticated dashboard moved
to `/dashboard`, and auth success/guest redirects now use `/dashboard`.

### Complete Home Task component

- [x] [#37 Create Home-Task-Component](https://github.com/AbidShaik09/Kheera-Frontend/issues/37)

**Scope:** Finish the reusable dashboard task item component to match the
documented component API and Penpot design.

**Requirements:**

- Honor the issue's input/output contract, including status-driven icons,
  relative timestamp display, clickable state, truncation, and stable height.
- Keep the component presentational with no modal or navigation logic.
- Expand unit tests beyond creation to cover rendering, click emission,
  non-clickable behavior, status icon behavior, and relative time formatting.

**Implementation notes:** `HomeTaskComponent` is implemented as a presentational
standalone component with a stable typed input model, status icon mapping,
relative time display, accessible click/keyboard activation, non-clickable
state support, truncation-friendly layout, and focused unit coverage.

### Create dashboard page sections

- [x] [#60 Create Dashboard Page Sections](https://github.com/AbidShaik09/Kheera-Frontend/issues/60)

**Scope:** Replace the current placeholder dashboard layout with the planned
sectioned dashboard structure.

**Requirements:**

- Implement left activity/favourites/spaces sections, main task sections for
  recently visited, last month, and earlier tasks, plus the right focus area.
- Preserve the planned grid proportions and minimal scroll behavior.
- Leave the calendar as a filler area until its standalone story is ready.
- Add responsive behavior and unit tests for section rendering.

**Implementation notes:** Dashboard now renders the planned left rail,
three-row main task board, and right focus rail. The calendar area remains an
explicit placeholder. Section rendering and task-card counts are covered by
unit tests.

## Phase 3: API-Backed Workspaces

Tracking issue: [#94](https://github.com/AbidShaik09/Kheera-Frontend/issues/94).

## Product flow

Confirmed from the product reference, current API contract and controller code (2026-09-21):
```
Login / signup / recovery (implemented)
  -> /dashboard
  -> Space (members, roles, permissions)
     -> Projects
        -> Project board / workflow stages
           -> Tasks (API: work items; optional parent/child hierarchy)
              -> Comments
              -> Task attachments
              -> Comment attachments
```
Workflow stages belong to a project and classify/order tasks; workflow is not a separate parent between project and task. Sprints are future project planning metadata. Use Jira-style board interactions and hierarchy while retaining Kheera's documented Penpot design. No Jira integration/import is requested.

## Delivery checklist

### Ready foundations

- [ ] [#85](https://github.com/AbidShaik09/Kheera-Frontend/issues/85) Workspace shell, live space switcher and navigation. **Implemented on issue branch, awaiting review:** [issue plan](issue-plans/issue-85_workspace-navigation.md). URL-selected dashboard context, live spaces, session-safe refresh and honest pending states; resource pages remain separate issues.
- [ ] [#86](https://github.com/AbidShaik09/Kheera-Frontend/issues/86) Space create/edit/delete.
- [ ] [#87](https://github.com/AbidShaik09/Kheera-Frontend/issues/87) Membership management and read-only role/permission catalogues.
- [ ] [#93](https://github.com/AbidShaik09/Kheera-Frontend/issues/93) Current-user profile and account menu. In progress: [issue plan](issue-plans/issue-93_current-user-profile.md).

### Project and task flow

- [ ] [#63](https://github.com/AbidShaik09/Kheera-Frontend/issues/63) Space details and project list. Metadata ready; listing blocked by backend #68.
- [ ] [#89](https://github.com/AbidShaik09/Kheera-Frontend/issues/89) Project create/edit/delete, blocked by backend #68.
- [ ] [#88](https://github.com/AbidShaik09/Kheera-Frontend/issues/88) Workflow configuration: stage APIs ready, normal project discovery needs backend #68.
- [ ] [#64](https://github.com/AbidShaik09/Kheera-Frontend/issues/64) Board reads/moves: APIs ready; project header needs backend #68, enriched task data needs #69.
- [ ] [#65](https://github.com/AbidShaik09/Kheera-Frontend/issues/65) Task Details/editing and collaboration integration, core blocked by backend #69.
- [ ] [#90](https://github.com/AbidShaik09/Kheera-Frontend/issues/90) Comments, blocked by backend #11; child of [#65](https://github.com/AbidShaik09/Kheera-Frontend/issues/65).
- [ ] [#91](https://github.com/AbidShaik09/Kheera-Frontend/issues/91) Task/comment attachments, blocked by backend #28/#11; child of [#65](https://github.com/AbidShaik09/Kheera-Frontend/issues/65).

### Personal dashboard

- [ ] [#92](https://github.com/AbidShaik09/Kheera-Frontend/issues/92) Replace sample tasks/focus with backend #70 aggregates and private visit history after project/task APIs.

## Backend coverage and boundaries

| Backend feature | Frontend coverage / decision |
| --- | --- |
| Auth and password recovery | Already completed #70, #71, #72; preserve existing behavior |
| GET users/me | [#85](https://github.com/AbidShaik09/Kheera-Frontend/issues/85), [#93](https://github.com/AbidShaik09/Kheera-Frontend/issues/93) |
| Space lifecycle | [#85](https://github.com/AbidShaik09/Kheera-Frontend/issues/85), [#86](https://github.com/AbidShaik09/Kheera-Frontend/issues/86), [#63](https://github.com/AbidShaik09/Kheera-Frontend/issues/63) |
| Members, roles, permission catalogue | [#87](https://github.com/AbidShaik09/Kheera-Frontend/issues/87); no custom role editing or invitations API |
| Workflow CRUD, board reads, task moves | [#88](https://github.com/AbidShaik09/Kheera-Frontend/issues/88), [#64](https://github.com/AbidShaik09/Kheera-Frontend/issues/64) |
| Projects, task CRUD, dashboard | [#89](https://github.com/AbidShaik09/Kheera-Frontend/issues/89), [#63](https://github.com/AbidShaik09/Kheera-Frontend/issues/63), [#65](https://github.com/AbidShaik09/Kheera-Frontend/issues/65), [#92](https://github.com/AbidShaik09/Kheera-Frontend/issues/92); pending backend #68/#69/#70 |
| Comments, attachments | [#90](https://github.com/AbidShaik09/Kheera-Frontend/issues/90), [#91](https://github.com/AbidShaik09/Kheera-Frontend/issues/91); pending backend #11/#28 |
| GET users | No unrestricted directory UI; use scoped members and add by existing-account email |
| Health, weather demo, SMTP worker | Infrastructure/demo; no product frontend issue needed |

The backend already implements stage APIs on develop although #45 remains open. Several prose sections still say “issue branch”; inspect source rather than infer availability from issue state. Implementation availability is not proof of deployment.

## Deferred product scope

Project links, sprint/status management, full work-item-type administration and project activity remain under backend #10; task audit activity remains under #11. Profile editing/upload, custom roles, favourites, calendar, global search and in-app notifications lack complete implemented contracts. Create narrowly scoped frontend follow-ups when their backend contracts exist; do not turn placeholders into fake persisted features. SMTP email delivery is not an in-app notification API.

## Completion

- [ ] The user can create a space, add an existing member, create a project, configure stages, create/assign a task, move it, comment and attach files, then return through breadcrumbs/dashboard.
- [ ] Every list/read/mutation handles access revocation, empty/loading/error states, responsive layout and keyboard use; no sample data presented as user data.
- [ ] Each child records tests, browser checks, actual backend dependency status and documentation updates before closure. This tracking issue does not imply feature implementation.

## Sources

- [API contract](https://github.com/AbidShaik09/Kheera-Backend/blob/d14b8c3397b34fcdc142b8f78dcb171ed756ed3a/docs/workspace/api/API_CONTRACT.md)
- [Backend controllers](https://github.com/AbidShaik09/Kheera-Backend/tree/d14b8c3397b34fcdc142b8f78dcb171ed756ed3a/src/main/java/com/knightdevelopers/kheerabackend/controller)
- [Documented product/Penpot flow](https://github.com/AbidShaik09/Kheera-Backend/blob/develop/docs/workspace/product/PROJECT_REFERENCE.md)
- [Frontend routes](https://github.com/AbidShaik09/Kheera-Frontend/blob/29c12f8d3fe7258caa23b901d562c3056205b553/src/app/app.routes.ts)
- [Placeholder dashboard implementation](https://github.com/AbidShaik09/Kheera-Frontend/blob/29c12f8d3fe7258caa23b901d562c3056205b553/src/app/pages/dashboard/dashboard.ts)

Backend issue numbers in this overview refer to [Kheera-Backend](https://github.com/AbidShaik09/Kheera-Backend/issues); all checklist issue links refer to this frontend repository.

## Delivery guardrails

Completed landing #5, task component #37 and dashboard layout #60 remain complete; their merged PRs are #77, #78 and #79. New API integration is tracked separately above.

- [ ] Coordinate frontend CI/deployment safety with [backend #55](https://github.com/AbidShaik09/Kheera-Backend/issues/55).

Start each integration only when its backend contract is implemented or explicitly mocked behind a documented adapter. Keep this TODO and issue statuses aligned during implementation.

