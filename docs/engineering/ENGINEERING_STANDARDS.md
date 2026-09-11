# Frontend Engineering Standards

## Mandatory Delivery Flow

1. Create or confirm a GitHub issue before changing a feature, bug, API use,
   design behavior, accessibility behavior, or runtime configuration. Include
   acceptance criteria, affected routes, API contracts, and design links or
   images where available.
2. Add the issue to `docs/planning/IMPLEMENTATION_TODO.md` in delivery order.
3. Read the complete issue and its attachments before coding. Inspect existing
   components, routes, services, tests, API contracts, and Penpot references.
4. Start from an up-to-date, clean `develop` branch and create
   `issue/<number>_<short-kebab-title>`, for example
   `issue/66_establish-frontend-workflow`. Never branch feature work from
   `main`.
5. Write or update focused unit tests before implementation. Mock API and other
   irrelevant dependencies so the test proves the component, service, guard, or
   interceptor behavior being changed.
6. Implement the smallest complete change with clear names, typed contracts,
   input validation, accessible semantics, keyboard behavior, responsive
   layouts, loading states, empty states, and actionable error messages.
7. Update every relevant shared and frontend document according to the
   [Kheera documentation standards](https://github.com/AbidShaik09/Kheera-Backend/blob/develop/docs/workspace/governance/DOCUMENTATION_STANDARDS.md). Update API, architecture,
   style, and design records with implementation; update progress and major
   change history after a material merge or deployment.
8. Self-review the diff, test changed requirements, run the relevant tests and
   production build, and inspect the screen at desktop and mobile widths.
9. When asked to push, push only the issue branch and open a PR to `develop`,
   never `main`. Wait for code review and required checks before merge.

If the worktree is dirty or the repository lacks `develop`, do not switch
branches over existing work. Preserve it and resolve the baseline first.

## Styling and Theme Rules

- Light and dark modes are required for every new screen and state. Verify text,
  border, focus, icon, disabled, error, and hover contrast in both modes.
- Centralize reusable colors, spacing, type, shadows, radii, and breakpoints in
  the existing token/theme layer. Use semantic tokens such as surface, text,
  border, and action rather than page-specific hardcoded colors.
- Build any future named themes as token overrides. Components must consume
  semantic variables so a new theme does not require scattered component edits.
- Reuse existing components and patterns before introducing variants. Keep
  component styles locally scoped only for behavior unique to that component.
- Do not bypass Angular sanitization, render untrusted HTML, store tokens in
  unsafe locations, log credentials/OTPs, or commit API keys, passwords,
  tokens, certificates, `.env` files, or private runtime configuration.

## Definition of Done

- Issue, TODO state, route/API contract, architecture/progress records, and
  design references are current.
- Tests cover success, failure, loading, empty, validation, and permission
  states relevant to the change.
- The production build and relevant unit tests pass.
- The UI is checked in light and dark mode at desktop and mobile widths.
- The PR targets `develop` and awaits review before merge.
