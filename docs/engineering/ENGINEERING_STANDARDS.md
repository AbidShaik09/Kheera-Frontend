# Frontend Engineering Standards

## Mandatory Develop Synchronization

Before starting any implementation or documentation edit, including TODO updates,
issue planning, and docs-only direct pushes, use a clean checkout and synchronize
`develop` with GitHub. Being on `develop` or having a cached `origin/develop`
reference is not proof that the branch is current.

1. Check `git status --short`. Preserve existing changes; use a separate clean
   checkout/worktree when needed. Never reset, discard, or overwrite user work.
2. Check out `develop`, then run `git fetch origin develop` and
   `git merge --ff-only origin/develop`. If local `develop` does not exist,
   fetch first and create it tracking `origin/develop`, then repeat the sync.
3. Verify `git rev-parse HEAD` equals `git rev-parse origin/develop` and the
   worktree is clean. If fetching fails, fast-forwarding fails, or local
   `develop` is ahead/diverged, resolve the baseline before editing. Never
   treat a failed fetch as permission to use stale code or documentation.
4. Read the current rules, API contracts, and relevant implementation from this
   synchronized baseline before making decisions or edits.
5. For a new GitHub issue implementation, create
   `issue/<number>_<short-kebab-title>` only from this verified latest
   `develop`. Refresh and verify again immediately before branch creation if
   other work has intervened. Never branch from `main`, an old issue branch,
   or an unrefreshed local/tracking branch.
6. For resumed issue work, fetch current `develop` and integrate it into the
   existing issue branch before new edits, preserving its commits and resolving
   conflicts. Do not recreate the issue branch or discard its work.

Docs-only changes follow the standing direct-to-`develop` push instruction;
they are not exempt from this synchronization rule. Inspect the diff and verify
documentation before committing. If the remote advances before the push, fetch,
integrate the new commits safely, and recheck the result; never force-push.


## Mandatory Delivery Flow

1. Create or confirm a GitHub issue before changing a feature, bug, API use,
   design behavior, accessibility behavior, or runtime configuration. Include
   acceptance criteria, affected routes, API contracts, and design links or
   images where available.
2. Add the issue to `docs/planning/IMPLEMENTATION_TODO.md` in delivery order.
3. Read the complete issue and its attachments before coding. Inspect existing
   components, routes, services, tests, API contracts, Penpot references, and
   `public/` assets. If a Penpot board is linked, open the exact board before
   implementation and treat it as the visual source of truth.
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
8. Before creating a PR, verify that all relevant docs were updated in the same
   branch. This includes README files, architecture notes, API/service
   contracts, design guidance, implementation TODOs, testing notes, and any
   cross-repo documentation affected by the change.
9. Self-review the diff, test changed requirements, run the relevant tests and
   production build, and inspect the screen at desktop and mobile widths. For
   Penpot-backed screens, compare the browser result against the board before
   calling the issue complete.
10. When asked to push, push only the issue branch and open a PR to `develop`,
   never `main`. Include a GitHub closing keyword in the PR body, such as
   `Closes #72`, so the linked issue closes automatically when the PR is
   merged. Wait for code review and required checks before merge.

If the worktree is dirty or the repository lacks `develop`, do not switch
branches over existing work. Preserve it and resolve the baseline first.

## Codex Network Sandbox Rules

- Codex shell commands run in a restricted sandbox by default. Network commands
  can fail with connection errors even when GitHub credentials, npm tokens, or
  backend credentials are valid.
- For commands that clearly require internet access, such as `git push`,
  `git fetch`, `git pull`, `npm install`, remote API checks, or CLI-based PR
  creation, request network approval instead of repeatedly retrying in the
  default sandbox.
- When requesting approval, use the narrowest reasonable persistent prefix. For
  example, prefer `git push` for pushing branches and `cmd /c npm` for Angular
  test/build commands that need normal filesystem access.
- If a network command first fails with `Could not connect to server`,
  DNS/host-resolution errors, package registry errors, or similar sandbox
  symptoms, rerun the same command once with approval and mention that the first
  failure was sandbox-related.
- If GitHub CLI is unavailable, use the GitHub connector to create or update the
  PR after pushing the branch.

## Pull Request Creation Rules

- Every feature or bugfix PR must target `develop`.
- Every issue-backed PR body must include at least one closing keyword in the
  form `Closes #<issue-number>`, `Fixes #<issue-number>`, or
  `Resolves #<issue-number>`.
- Prefer `Closes #<issue-number>` for normal implementation PRs so GitHub links
  the PR and issue clearly.
- Do not rely on commit messages, branch names, or PR titles to close issues.
  Put the closing keyword in the PR body.
- GitHub closes issues automatically only when the PR is merged into the
  repository default branch. If the team expects issues to close when PRs merge
  into `develop`, the repository default branch must be `develop`; otherwise
  close the issue manually or merge `develop` into the default branch.

## Styling and Theme Rules

- Penpot-backed screens must match the referenced board's composition,
  hierarchy, copy, proportions, and asset usage. Use responsive CSS to make the
  board work on real screens, but do not replace the design with a different
  layout, decorative concept, or placeholder visual direction.
- Product logos, icons, and imagery must be reused from `public/` or the
  approved design source when available. Do not create CSS/text substitutes for
  existing brand assets.
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

## Frontend Architecture Rules

- Page components own view state only: form controls, validation display,
  loading flags, local success/error messages, and navigation after a successful
  service result.
- Backend communication belongs in injectable services. Components must not call
  `HttpClient` or construct API URLs directly.
- Keep backend response contracts explicit. Use JSON helpers for JSON APIs and
  text helpers, such as `ApiService.postText`, for raw string contracts like
  JWTs and OTP status messages. Do not rely on TypeScript generics to change
  Angular's runtime response parser.
- `AuthService` owns authentication-specific behavior: login/signup/reset API
  calls, token storage, login state, and backend auth message extraction.
- Preserve backend error messages when they are actionable for the user, but do
  not expose secrets, tokens, stack traces, or sensitive account-discovery
  details.

## Definition of Done

- Issue, TODO state, route/API contract, architecture/progress records, and
  design references are current.
- Relevant README and documentation updates are included before PR creation.
- Penpot-backed UI has been visually checked against the referenced board at a
  realistic desktop viewport and a mobile viewport.
- Tests cover success, failure, loading, empty, validation, and permission
  states relevant to the change.
- The production build and relevant unit tests pass.
- The UI is checked in light and dark mode at desktop and mobile widths.
- The PR targets `develop` and awaits review before merge.

## Codex Review After PR Creation

Immediately after creating any pull request, add a PR comment containing exactly
`@codex review` to request Codex review. Verify that GitHub accepted the comment
and record its URL in the delivery notes. This applies to every newly created
PR, including drafts; do not wait for review findings before requesting the
initial review. After addressing and resolving review comments, post a new
`@codex review` comment for the updated head. A posted request is not evidence
that review has completed; inspect and address the resulting review before
considering the PR ready.
