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

Follow these steps in order. Delivery requests do not bypass validation gates.

1. Complete **Mandatory Develop Synchronization** above. Read the complete issue,
   attachments, components, routes, services, tests, API contracts, and available
   `public/` assets. Open the exact linked Penpot board and treat it as the visual
   source of truth. Confirm acceptance criteria, dependencies, security impact,
   and scope; resolve blocking ambiguity before coding.
2. Create `issue/<number>_<short-kebab-title>` from the verified baseline.
   Add/update the issue in `docs/planning/IMPLEMENTATION_TODO.md` in dependency
   order. Create and commit the **Required Issue Plan** below.
3. Write tests first. Reproduce bugs with failing regression tests; for features,
   test required behavior before implementing it. Name tests for services,
   components, guards, or interceptors as applicable. Mock external dependencies.
   Run tests and record the expected behavior failure, not a setup error.
4. Implement in the plan's dependency order: typed API contracts and services,
   state/guards, components/templates, then styles and responsive behavior.
   Write each affected unit's tests before implementation. Include validation,
   accessibility, keyboard behavior, loading, empty, success, and error states.
5. Run targeted tests after each phase. Fix failures according to the contract,
   then rerun failed and affected regression tests. Do not weaken tests to pass.
6. Update relevant README, API/service contracts, architecture, style/design,
   testing, TODO, and cross-repository docs with implementation, following the
   [documentation standards](https://github.com/AbidShaik09/Kheera-Backend/blob/develop/docs/workspace/governance/DOCUMENTATION_STANDARDS.md).
   Record evidence and deviations in the plan.
7. Run the full unit suite with `npm test -- --watch=false` and production
   build with `npm run build`. Start locally with `npm start`; exercise affected
   flows, including API success/failure and permission states. Inspect desktop
   and mobile widths in light and dark mode, keyboard interaction and focus.
   Compare Penpot-backed screens with the exact board.
8. If regressions or required checks fail, fix branch-caused defects and rerun
   the failed checks, affected browser checks, full unit suite, and production
   build. Repeat until all gates pass. Repeat validation after upstream
   integration, conflict resolution, or review fixes. Record exact commands,
   results, and manual evidence for the resulting branch.
9. Self-review the final diff against every acceptance criterion and plan step,
   including security, API compatibility, accessibility, design, and docs.
10. When delivery is requested, push the issue branch and create a PR to
    `develop`, with a closing keyword, plan link, summary, and verification
    evidence. Immediately request Codex review as specified below.
11. Inspect CI and review findings. Fix valid findings, repeat validation, push,
    resolve addressed threads with evidence, and request a fresh `@codex review`.
    Review blockers and update rules where a concrete change prevents recurrence.
    If stopped for wrong direction, correct the misunderstanding in the issue
    or rules before resuming.
12. Merge only after required checks, review, and applicable merge authorization.
    Confirm issue closure under **Pull Request Creation Rules**. Update progress
    and history after material merge/deployment; verify the deployed affected
    flow when deployment occurs. Keep pending steps pending in the plan.

### Blockers and docs-only delivery

Do not push or declare readiness while a required validation gate is failing or
unverified. Record blockers, fix them, or ask the owner for guidance. Follow the
network sandbox rules below for environment restrictions.

For owner-requested documentation/rule-only changes, use synchronized clean
`develop`, inspect the diff and verify links/instructions, commit, and push
directly to `develop` under the standing instruction. No issue, implementation
plan, application tests, or PR is required for this path. It must contain no
code, runtime configuration, dependency, or generated artifact changes.
Issue plans accompanying implementation stay on the issue branch and in its PR.

## Required Issue Plan

Before changing application code or tests, create
`docs/planning/issue-plans/issue-<number>_<short-kebab-title>.md` on the issue
branch. Start from the [issue-plan template](../planning/issue-plans/README.md).
One issue gets one plan; grouped PRs must link each issue's plan.

The initial plan must be executable by another bot without guessing: map each
acceptance criterion to named tests and implementation steps, identify affected
files and contracts, list dependencies and risks, and specify exact commands,
expected results, and manual checks. Include every applicable delivery gate
in these standards, including documentation, regression, PR creation, and Codex review.
Replace template placeholders before implementation. Mark inapplicable steps
with a reason; never silently omit a gate. Missing requirements or unresolved
contract/design decisions that affect implementation must be clarified before
coding.

Use ordered checkboxes. Before each phase, compare the next step with the issue
and plan. Record new evidence, scope decisions, and reasons for changes before
continuing; obtain clarification when a change alters the requested scope.
Keep completed steps and their evidence rather than rewriting history.
After interruptions, read the plan and repository state before resuming.

Commit the initial plan before application code or test changes. Commit plan
updates with the work they describe and push them in the implementation PR.
These documents are expected PR content, not ignored scratch files. Do not
mark a test, review, merge, or deployment complete until evidence exists.
Link the plan from the PR and record PR/review URLs in it.

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

- Issue plan checkboxes and validation evidence reflect the actual delivery state.
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

## Required test layers

Follow [Frontend testing strategy](../testing/TESTING_STRATEGY.md). Every feature uses TDD with recorded behavior failures, unit coverage, frontend integration coverage across real collaborating layers, and browser smoke checks for affected journeys. Before delivery run npm run verify; preserve full-suite regression, production build and visual/API smoke requirements above. Passing mocked browser tests is not evidence that the deployed backend works.
