# Issue #64: Project task board

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/64
- Branch issue/64_project-board, clean synchronized develop 964019f589df18d36ff2e5f39def1cb4604d68b3.
- Replace project summary placeholder with API-backed board, retaining project metadata/settings links. Dependencies #63/#85/#68 and workflow settings #88 are implemented; stale open issue statuses are not blockers.
- Read current backend WorkflowStageController/Service, BoardPageDto, BoardWorkItemDto, MoveWorkItemRequest and repository ordering. GET projects/{id}/workflow-stages and work-items?groupBy=stage&page=N&size=25; POST work-items/{id}/move with {stageId}. Reads scoped by UUID; mutation requires parent space.update. Current board DTO has no assignee/type/sprint/epic metadata. Task creation/detail remains #65; no fake links or unsupported filters.
- All moves (drag/drop and keyboard form, including same-column) append, omitting position. Visible page indexes are never global indexes. Explicit previous/next pagination replaces the current page; counts labelled on this page, global total labelled tasks. Successful move reloads all metadata and page zero, covering both source/destination. No optimistic mutation: pending state keeps original cards, ordinary failure preserves them. No server stale-board rejection is assumed.
- No exact Project Details Penpot URL found in issue/repository. Use documented project header plus ordered columns, existing shell/assets/semantic tokens; responsive stacked columns on mobile. No invented activity/backlog/sprint content.

## Acceptance/test mapping
| Criterion | Named tests | Expected |
| --- | --- | --- |
| Contract, >25, empty columns, custom completed stages | project-board-service.spec.ts and project-board.integration.spec.ts | Scoped read, valid groups/page totals; completion boolean |
| Moves/permissions | service/integration/browser | UUID append body, same/cross stage, serialized pending, authoritative reload |
| Errors/races | service/integration | 401 logout, 403/404 clear, ordinary failure retains cards, stale navigation/account ignored |
| Interaction/design | project-board.smoke.spec.ts desktop/mobile light/dark | Keyboard move form and native drag/drop, explicit paging, no overflow, focus/status |

## Files and execution
- services/project-board-service.ts: typed page/move transport, response guards and session protection.
- pages/project-board/*: state/route cancellation, permission-aware page/drag/form controls; existing project-summary route now loads this page.
- Existing project navigation integration/browser fixtures updated for newly required board reads. ProjectSummaryService remains a compatible read adapter.
- README, architecture/SPACE_DETAILS.md and WORKSPACE_NAVIGATION.md, design/STYLE_GUIDE.md, testing/TESTING_STRATEGY.md, TODO updated. No backend/schema/dependency changes.
- [x] Read synchronized baseline, issue, contracts, available design/assets and tests.
- [x] Commit this initial plan and TODO before application/tests.
- [x] Write compilable adapter tests, record behavior failures, implement and pass.
- [x] Write route/browser expectations first, record missing board behavior, implement state/template/styles, targeted checks.
- [x] Update docs and self-review contracts/security/concurrency/accessibility.
- [x] Run PLAYWRIGHT_CHANNEL=msedge npm run verify (unit, integration, build, browser); fix failures and repeat required gates.
- [x] Start npm start on loopback; visually inspect desktop/mobile light/dark screenshots and keyboard behavior. Fixture APIs do not prove deployed backend behavior; no live account assumed.
- [x] Commit/push; PR to develop with Closes #64, plan and validation. Immediately post @codex review, record links.
- [ ] Inspect CI/review, repair findings and rerun validation; fresh review after fixes. Merge/deployment outside requested scope.

## Evidence
Initial plan committed as 9378b02. TDD: 16 adapter tests failed against a compilable stub; 6 route tests failed on missing board after fixing test harness setup/HTTP cleanup. Focused implementation: 22 passed. Full integration regression: 45 passed. Full verification running: 215 unit and 45 integration passed; production build passes with existing 521.35 kB initial-bundle warning (500 kB warning, below 1 MB error). Development server started successfully at 127.0.0.1:4301 and was stopped. Inspected all four desktop/mobile light/dark screenshots: readable columns, counts and forms, no document overflow. First full browser pass: 141 passed, 1 mobile drag failure. The test aimed at an embedded form control/offscreen column center; title-to-header drag passes both viewport sizes. Final PLAYWRIGHT_CHANNEL=msedge npm run verify passed: 215 unit tests, 45 integration tests, production build and all 142 browser tests. No exact Penpot board URL and no authorized deployed-backend account; fixture checks are frontend-only. Opened [PR #106](https://github.com/AbidShaik09/Kheera-Frontend/pull/106) to develop. Initial [Codex review request](https://github.com/AbidShaik09/Kheera-Frontend/pull/106#issuecomment-5933857411) accepted. CI/review pending at this documentation snapshot; merge/deployment outside requested scope.
