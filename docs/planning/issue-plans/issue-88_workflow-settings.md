# Issue #88: Project workflow settings

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/88
- Branch: issue/88_workflow-settings; verified develop 1426932e1b7da6988eb5846e29703c8674d3d63e.
- Configure ordered project stages (name, optional icon, position, complete) from the existing project overview. Board/task movement remains #64; no board cache exists yet. Returning to overview reloads project metrics; settings always refetch stages after mutations.
- Backend WorkflowStageController, WorkflowStageRequest/Dto and WorkflowStageService on current origin/develop are authoritative. GET/POST projects/{id}/workflow-stages; PATCH/DELETE add stage UUID. Writes require parent space.update. All PATCH fields omitted preserve values; empty icon clears; never send null. Java String.length limits use UTF-16 units (name 1–100 trimmed, icon <=255), position integer 0..2147483647 and backend clamps oversized positions. Maximum 100 stages.
- Reviewed frontend engineering/testing standards, issue, existing project/space services, editor styles, public assets and backend product reference. No workflow-settings Penpot board is linked or specified; reuse existing editor and shell composition/tokens. Current project navigation satisfies discovery despite stale dependency prose. No blocking product decisions.

## Acceptance and tests
| Criterion | Named tests / procedure | Expected |
| --- | --- | --- |
| Typed ordered custom stages | workflow-stage-service.spec.ts: list order/shape/duplicates, renamed completed stage | Server order and boolean classification preserved |
| Validation and sparse writes | service tests: UTF-16 name/icon limits, position bounds, empty icon, omission | Exact valid payloads, no null or enum |
| Permission/error/session | service and workflow-settings.integration.spec.ts: 401/403/404, malformed payload, stale navigation/session | No unauthorized actions or stale private state |
| Lifecycle/conflicts | integration and workflow-settings.smoke.spec.ts: create/edit/reorder/delete; STAGE_NOT_EMPTY/LAST_STAGE/STAGE_LIMIT | Refresh authoritative stages, retain recoverable draft, honest failures |
| Accessibility/design | desktop/mobile light/dark lifecycle screenshots; keyboard form, confirmation, focus | Labelled fields, visible status, no overflow, focus restored |

## Files and design
- services/workflow-stage-service.ts owns contracts, validation and transport; stateless injectable adapter for reuse by future board.
- pages/workflow-settings/* owns draft and route state, permission reads through existing project/space services, generation/session guards and confirmation. Serialize writes; reload project, grants and stage metadata after mutations/conflicts. Revoke controls during failed refresh; preserve draft until confirmed inaccessible.
- app.routes.ts adds projects/:projectId/workflow; project overview links Workflow settings. Project-prefixed route title keeps correct shell context.
- Reuse space-editor CSS and semantic tokens, add only stage-list styles. Icons rendered as escaped text, never arbitrary URLs/HTML.
- Update README, architecture/SPACE_DETAILS.md, design/STYLE_GUIDE.md, testing/TESTING_STRATEGY.md and planning/IMPLEMENTATION_TODO.md. No backend, schema or dependency change.

## Ordered execution
- [x] Verify clean synchronized baseline, issue and implemented contracts.
- [ ] Commit initial plan and TODO before application/test edits.
- [ ] Write service tests with compilable stub; run expected behavior failures, implement adapter, rerun focused tests.
- [ ] Write route integration/browser expectations before UI; record expected failures, implement editor and targeted regressions.
- [ ] Update relevant docs and self-review scope, permissions, stale responses and accessibility.
- [ ] Run PLAYWRIGHT_CHANNEL=msedge npm run verify (full unit/integration, production build, browser suite); repair failures and repeat required gates.
- [ ] Start npm start on loopback; inspect desktop/mobile light/dark screenshots and keyboard flows. Browser API fixtures are not deployed-backend verification; no authorized live account available.
- [ ] Commit/push, create PR to develop with Closes #88 and plan/evidence; immediately post exactly @codex review and record links.
- [ ] Inspect CI/reviews, repair valid findings, rerun validation and request fresh review if changed.
- [ ] Merge/deployment outside requested raise-PR scope; report actual state and keep pending gates pending.

## Evidence and delivery
Pending implementation. Record initial failing tests and final counts, build/start/visual checks, PR and review URLs. Resolve actual review findings and record fresh evidence before reporting readiness.
