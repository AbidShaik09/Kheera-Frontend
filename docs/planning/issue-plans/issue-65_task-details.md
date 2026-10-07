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
- [ ] Commit initial plan/TODO before application tests/code.
- [ ] Add compilable behavior tests; run expected red; record results.
- [ ] Implement typed service/payloads; pass focused service tests.
- [ ] Write route tests before route/editor implementation; record red; implement state/form/relations/permissions.
- [ ] Add browser journeys and responsive semantic styles; targeted regressions.
- [ ] Update documentation and self-review all criteria/security/contract boundaries.
- [ ] Run npm test -- --watch=false and PLAYWRIGHT_CHANNEL=msedge npm run verify (unit/integration/production/browser); repeat after fixes.
- [ ] Start npm start on loopback; verify keyboard/focus and desktop/mobile light/dark screenshots. Run disposable local-backend API smoke where available; fixtures alone are not deployment proof.
- [ ] Commit/push; PR to develop with Refs #65, dependent-slice explanation, plan/evidence. Immediately post @codex review and attach PR.
- [ ] Inspect CI/review; repair real findings, repeat gates, reply/resolve and request fresh review. Merge/deployment pending explicit authorization.

## Evidence and delivery
Initial plan only; checks pending. Latest backend develop e0e84109ec9819fd3a70fc6bc4df1ca610632444. PR #84 merged 2026-10-03. Frontend #65 overall collaboration scope stays open. No exact design URL or production account assumed.