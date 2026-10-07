# Issue #65: Task Details and editing

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/65
- Branch: issue/65_task-details; synchronized clean develop fb774c3359929d4c2405132b9b13b288bc01d098 on 2026-10-07.
- Backend #69 merged in PR #84. Read the final WorkItemController, WorkItemWriteRequest, detail/board DTOs, membership and workflow contracts. Transport uses UUIDs and assigneeMemberId, with sparse PATCH/null clearing. Task writes require space.update, including deletion.
- Deliver core editing as the explicitly permitted independent slice of #65: direct /work-items/:workItemId, project-scoped creation, title/description/type/stage/parent/children/member/effort/instant dates, deletion confirmation and child conflict. Comments #90, uploads #91 and visit history #92/backend #70 remain unavailable and must not be presented as persisted functionality. Keep #65 open for dependent slices; PR uses Refs #65 rather than falsely closing overall acceptance.
- No exact Task Details Penpot URL is linked in the issue or repositories (searched docs and issue body). Follow documented Task Details editor panel composition, status, restrained destructive accent and existing shell/semantic tokens. Exact-board comparison unavailable; record this limitation. Existing public assets used by shell are retained.
- Preserve drafts on ordinary failures; clear scoped content after 403/404/logout; ignore stale route/account responses. No sprint/issue number. No cached dashboard tasks introduced; board/project refresh on navigation reloads authoritative data.

## Acceptance and test mapping
| Requirement | Tests / manual verification | Expected |
|---|---|---|
| Typed CRUD, sparse changes/null and dates | task-service.spec.ts | UUID paths, membership IDs, only changed fields; UTC instants and unmodified precision preserved |
| Limits, hierarchy, historical assignee | task-service.spec.ts; task-details.integration.spec.ts | Unicode lengths, nonnegative int effort, date ranges, self-parent rejection; server cycles errors preserved; historical inactive assignment retained/clearable |
| Deep links, creation, children/parent lookup | task-details.integration.spec.ts; task-details.smoke.spec.ts | Authorized detail, project context, explicit paged related lists, creation from board/child |
| Errors and concurrency | service/integration/browser | 400/409 drafts retained, 403/404 clear, 401 logout, duplicates blocked, stale route/account ignored |
| Keyboard/design | browser desktop/mobile light/dark | labelled form/errors, confirmation Escape/focus, responsive panel, no overflow |
| Collaboration boundaries | integration/browser | explicit unavailable comments/uploads/visits, no unsupported requests |

## Design and files
- services/task-service.ts owns detail/create/update/delete/type reads and filtered task pages with response validation/session guards. Pure draft conversion/validation/payload functions own omission/null/date precision.
- pages/task-details/* owns route state, editor, paged member/parent choices, child links, error retry and delete confirmation. Reuse project/space/workflow/membership services. Assignment options use scoped member UUIDs; paged search avoids assuming first page is complete.
- app.routes.ts adds task/new-task routes; project-board links task titles and creation. Shell resource routes must not infer unrelated space query context.
- README, docs/architecture/TASK_DETAILS.md, STYLE_GUIDE, TESTING_STRATEGY, TODO and this plan updated. Backend contract unchanged; no schema/dependency change.

## Ordered execution
- [x] Verify clean synchronized baseline, issue, merged backend contract, assets/design guidance and existing code/tests.
- [x] Commit initial plan/TODO before application tests/code.
- [x] Add compilable behavior tests; run expected red; record results.
- [x] Implement typed service/payloads; pass focused service tests.
- [x] Write route tests before route/editor implementation; record red; implement state/form/relations/permissions.
- [x] Add browser journeys and responsive semantic styles; targeted regressions.
- [x] Update documentation and self-review all criteria/security/contract boundaries.
- [x] Run npm test -- --watch=false and PLAYWRIGHT_CHANNEL=msedge npm run verify (unit/integration/production/browser); repeat after fixes.
- [x] Start npm start on loopback; verify keyboard/focus and desktop/mobile light/dark screenshots. Run disposable local-backend API smoke where available; fixtures alone are not deployment proof.
- [x] Commit/push; PR to develop with Closes #107 and Refs #65, dependent-slice explanation, plan/evidence. Immediately post @codex review and attach PR.
- [ ] Inspect CI/review; repair real findings, repeat gates, reply/resolve and request fresh review. Merge/deployment pending explicit authorization.

## Evidence and delivery
Initial plan only; checks pending. Latest backend develop e0e84109ec9819fd3a70fc6bc4df1ca610632444. PR #84 merged 2026-10-03. Frontend #65 overall collaboration scope stays open. No exact design URL or production account assumed.
TDD evidence: 6 initial service tests failed against compilable transport/payload stubs; route helper type error was fixed before recording 4 behavior failures for missing detail requests. After implementation 10 service/route cases passed. Added further contract, date/calendar and historical-metadata regressions; full verify pending. Overall issue stays open because dependent comments/uploads are not delivered.

Delivery refinement: core editing extracted as [#107](https://github.com/AbidShaik09/Kheera-Frontend/issues/107) during delivery to satisfy closing-keyword policy without closing unfinished collaboration acceptance. Original plan was committed before all code/tests; no scope changed. PR will Closes #107 and Refs #65. See the [core delivery plan](issue-107_task-editing-core.md). Self-review member-search 403 regression failed with retained editor, then passed after scoped clearing; 14 focused task cases pass.

Schema self-review: V17 efforts is nullable (default 1). A new service regression failed because the reader rejected historical null. Reader/draft validation now preserves null on unrelated edits, and a browser regression verifies an empty effort stays omitted. The first expanded assertion was accidentally inserted into the inactive-member test; moved it to the nullable-effort case. Final full gates are repeated after this repair. Live frontend/backend smoke before this compatibility-only reader repair passed CRUD, assignment, parent/cycle 400, delete 409, exact microsecond preservation, reload and board refresh on local disposable PostgreSQL/backend; no deployment claim.

Final pre-PR evidence (2026-10-07): npm test -- --watch=false passed 281 tests in 44 files. PLAYWRIGHT_CHANNEL=msedge npm run verify passed 227 unit tests, 54 integration tests, production build, and 162 desktop/mobile browser checks with zero failures/skips. Existing initial-bundle warning: 523.04 kB vs 500 kB warning, below error budget. Screenshots inspected desktop/mobile light/dark; semantic layout readable without document overflow; no exact board supplied. Local npm start served 4200; merged backend via spring-boot:run PID 11896 on 18065, disposable PostgreSQL 15465. Live UI/API checks passed as recorded above; verified task-owned servers and container stopped. No dependencies/backend changes, secrets, generated artifacts or unrelated work included. CI/review pending.

Delivery: [PR #108](https://github.com/AbidShaik09/Kheera-Frontend/pull/108) targets develop, implementation d50dc04. Immediate [Codex request](https://github.com/AbidShaik09/Kheera-Frontend/pull/108#issuecomment-6031631285) accepted. CI/review pending. Core #107 closes on delivery/merge policy; parent #65 remains open. No merge requested.
