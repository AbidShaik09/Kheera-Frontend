# Issue #85: Workspace navigation and live space switcher

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/85
- Branch: issue/85_workspace-navigation, synchronized develop 79d504f59cde915bca2c0630afa1381533a398d3.
- User requested testing workflows on develop first; completed in 79d504f before this branch. Backend baseline 4fbd914 now includes project CRUD.
- Highest-priority ready foundation: authenticated shared sidebar, real spaces, URL selection and honest pending product sections.
- Inspected actual signed-in Penpot Dashboard board 50d807c0-bf4a-80c0-8008-464d14d3ca11 on Landing Page ea22f50a-78c1-8124-8008-441b3a16d3fa. Compact top bar, Activity/Favourites/Spaces left rail, three central task sections, right focus. Existing product logo available in public/images/kheera.webp. Preserve composition and semantic tokens, adapt to mobile.
- Scope boundary: #63/#64/#65 own actual space/project/task pages. Until they land use /dashboard?space=<UUID> for selected workspace, with breadcrumb Dashboard > space. Do not create dead future routes. #86 owns creation; clearly disabled Create space and onboarding explanation until it lands. No unsupported writable actions.
- Remove fake dashboard cards/focus as well as fake sidebar content rather than imply that selected spaces have mock tasks. #92 remains required for live task data.
- No schema/backend mutation or deployment change.

## Acceptance criteria and tests
| Criterion | Named tests / checks | Expected result |
| --- | --- | --- |
| Live array and states | workspace-service.spec.ts: loads array; empty; malformed; forbidden/not-found; retry | Safe typed data, no fake counts |
| Stale requests and session changes | workspace-service.spec.ts: latest refresh wins; logout hides immediately; old-session response ignored | No stale tenant/account data |
| Auth restoration race | auth-service.spec.ts: ignores prior session restoration | Old 401/success never changes a newer login |
| Selection + route restoration | workspace.integration.spec.ts: query selection, switch/back-style navigation, refresh, access loss | Visible selected space follows authorized URL |
| API boundary | workspace.integration.spec.ts: actual HTTP/interceptor/session + spaces | GET /api/spaces array and bearer handling work |
| Shared shell | workspace-shell.spec.ts: loading/empty/error/selection/unavailable | Accessible sidebar, retry, breadcrumb and outlet |
| Honest dashboard/navbar | dashboard.spec.ts + navbar.spec.ts | No sample cards/counters or enabled unsupported create/search/alerts |
| Browser acceptance | e2e/workspace.smoke.spec.ts | Desktop/mobile, light/dark, URL reload/back, retry, empty, revoked session, keyboard navigation |
| Visual alignment | compare local screenshots to inspected Penpot board | Same top/left/main/right composition, readable responsive states |

## Design and affected files
- services/workspace-service.ts: injectable GET spaces adapter and latest-request/session-scoped state. Capture epoch and token per request; computed views hide stale data immediately. No persisted cross-account space cache.
- services/auth-service.ts: explicit session epoch bumped on token replacement/clear, guarding async session restoration.
- components/workspace-shell: routed shared left rail, URL query context, skip link, live loading/error, responsive collapse and breadcrumbs. Query changes revalidate accessible spaces. A missing selected UUID shows unavailable and a link to all spaces; it never exposes an unauthorized name.
- app.routes.ts: protected shell around dashboard/profile/settings; public root/auth unchanged. No fake future resource routes.
- dashboard: keep task/focus composition, replace sample content with pending-state copy; real aggregates remain #92.
- navbar: preserve logo/theme/profile/settings; disable unsupported search/create/notifications with accessible names; add working sign-out.
- docs/architecture/WORKSPACE_NAVIGATION.md, README, testing strategy, TODO and this plan track ownership and evidence.
- N/A: backend schema/API changes, uploads, role edits, task CRUD and full-stack database tests. Network fixtures validate frontend integration, not deployed backend authorization.

## Ordered execution checklist
- [x] Inspect issue/contracts/routes/tests/assets/rules and signed-in Penpot dashboard.
- [x] Publish test prerequisites on develop; synchronize and create issue branch.
- [x] Commit this initial plan and mark TODO in progress.
- [x] Write service/session tests before service changes; run behavior failures against compiling scaffolds.
- [x] Implement typed service/session isolation; rerun service tests.
- [x] Write shell/router/dashboard/navbar tests before UI changes and record failures.
- [x] Implement routed shell, pending states, semantic styling and accessible navigation.
- [x] Add HTTP/router integration and browser smoke journeys; verify negative paths.
- [x] Run targeted tests after each change and complete npm run verify (local Edge override if Chromium download remains unavailable).
- [x] Start local app; check desktop/mobile/light/dark and keyboard/focus against Penpot; record evidence.
- [x] Update README, architecture, testing, TODO and plan; self-review full diff, security, stale state and scope.
- [x] Commit/push branch; create PR to develop with Closes #85, plan and verification.
- [ ] Request @codex review immediately and attach PR to task. Inspect CI/review, fix actionable findings, rerun affected/full gates and re-request review.
- [ ] Verify readiness; merge only with applicable explicit authorization. Keep merge/deployment pending until verified.

## Validation evidence
- Prerequisite workflow: 68 unit tests, 2 integration tests, production build passed (existing 550.32 kB warning); 4 smoke tests passed on installed Edge. Hosted CI run [35604677013](https://github.com/AbidShaik09/Kheera-Frontend/actions/runs/35604677013) was pending at branch creation and subsequently passed every gate including Chromium smoke.
- TDD evidence: service/session scaffold compiled and produced 11 behavior failures (3 baseline passes); shell/router/dashboard tests produced 8 expected failures; navbar produced 2 expected failures; cross-tab session regression produced 1 expected failure. Each was followed by implementation and passing targeted runs.
- Final npm run verify with PLAYWRIGHT_CHANNEL=msedge: 88 unit tests in 23 files, 5 integration tests in 2 files, production build 486.57 kB with no budget warning, and 18 browser smoke tests passed. API responses are isolated fixtures, not live-backend/deployment evidence. Desktop/mobile light/dark screenshots were visually reviewed against the inspected Penpot Dashboard; keyboard Enter, Escape/focus, Back/reload and sign-out were exercised in the browser suite.
- Deployment: not performed for feature.

## Plan changes and resume notes
- 2026-09-21: Actual project CRUD is now on backend develop. No change to #85 scope or priority.
- 2026-09-21: Use URL-selected dashboard context until resource-page issues land, as #85 says “as their feature issues land.” Disabled creation explains the #86 dependency; do not implement a second feature or dead route.

- 2026-09-22: Added cross-tab storage invalidation after self-review identified that shared localStorage token replacement could otherwise leave old account names visible. Regression failed before fix; unit and real second-tab browser tests now pass. Router construction also required a null-safe child snapshot, and integration assertions await asynchronous HTTP completion rather than assuming synchronous flush publication.

## Delivery
Review triage: [thread r4065378356](https://github.com/AbidShaik09/Kheera-Frontend/pull/95#discussion_r4065378356) is real. Space links used selectedId alone for aria-current, while account navigation preserves that query. A new router/HTTP regression failed on Profile (1 failed, 5 passed) before the fix. Current-page state now also requires Dashboard; regression covers Profile, Settings, and returning to Dashboard. Browser coverage exercises the real account controls on desktop and mobile. Review-fix validation passed: npm run verify (88 unit, 6 integration, production build 486.61 kB, 20 Edge browser smoke tests) and npm test -- --watch=false (94 tests in 25 files). Initial review was on 7108c3b; a fresh review is required after publishing this fix.

Feature published in [PR #95](https://github.com/AbidShaik09/Kheera-Frontend/pull/95). Initial review requested in [this comment](https://github.com/AbidShaik09/Kheera-Frontend/pull/95#issuecomment-5765736996) and PR attached to the task. Initial feature CI [35640515694](https://github.com/AbidShaik09/Kheera-Frontend/actions/runs/35640515694) passed. Combined Angular regression also passed all 93 tests across 25 files. Review and final-head checks remain pending. No feature merge authorized yet.
