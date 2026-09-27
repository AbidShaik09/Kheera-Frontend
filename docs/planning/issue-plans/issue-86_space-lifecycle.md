# Issue #86: Space creation, editing and deletion

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/86
- Branch: `issue/86_space-lifecycle`; synchronized develop `148b93df40412f69e7febf61183dc9b075bb2973` (2026-09-27).
- Implement authenticated `/spaces/new` and `/spaces/:spaceId/settings`, sidebar creation and capability-controlled settings links. No member/project mutations, uploads or restore action.
- Dependencies #85/#63 are present on develop. Read current backend origin/develop SpaceWriteRequest and lifecycle API contract, frontend services/routes/tests, engineering/testing/style standards and public assets.
- Design: product reference documents shell and Space Details composition; no exact linked Penpot board or create/settings frame is supplied for this issue. Preserve the existing shell and use its compact token-based form layout.

## Acceptance criteria and tests
| Criterion | Named tests / checks | Expected |
| --- | --- | --- |
| Create and refresh sidebar | lifecycle integration + browser create journey | POST trimmed name/optional values, returned UUID navigation, refreshed list |
| Unicode validation, URL safety | lifecycle validation unit tests | 255/500 code points; absolute HTTP(S), no credentials |
| PATCH omission/null and fieldErrors | lifecycle service/integration tests | changed fields only, null optional clearing, safe literal server errors |
| Capabilities/server authority | settings component/browser tests | separate update/delete controls; 403 revokes writes without losing draft |
| Delete confirmation and failure | lifecycle browser/integration | identity and descendant warning, 204 dashboard, retry on failure |
| Session/navigation races | lifecycle service/component tests | old responses ignored, current 401 logout, cleared route state |
| Accessibility/responsive/theme | browser desktop/mobile light/dark | labeled fields, keyboard actions, focus and no overflow |

## Design and affected files
- New `services/space-lifecycle-service.ts`: typed reads/writes, validation and sparse payload builder, session-safe results; HTTP exclusively through ApiService.
- New `pages/space-editor/*`: route-local metadata and draft state, create/edit/delete UX, confirmation and errors. No persistent descendants: existing detail/project services are route-scoped and cleared on teardown.
- Existing routes, workspace sidebar and Space Details settings link provide entry points.
- New unit, HTTP integration and browser specs. Update obsolete settings placeholder assertions.
- Update README, architecture/SPACE_DETAILS.md, design/STYLE_GUIDE.md, testing/TESTING_STRATEGY.md and IMPLEMENTATION_TODO.md. No backend contract changes; frontend ownership docs record consumption.
- Preserve optional description text; blank optional inputs clear on edit and are omitted on creation. Never infer grants from role names. Guard duplicate submissions and invalidate results on route/account change.

## Ordered execution
- [x] Inspect requirements/contracts and synchronize clean develop.
- [x] Create issue branch and complete initial plan.
- [ ] Commit initial plan and TODO before tests/application code.
- [ ] Write failing validation/service and entry-point tests; run `npm test -- --watch=false --include="**/space-lifecycle*.spec.ts" --include="**/space-details.spec.ts"`; record behavior failures.
- [ ] Implement typed lifecycle service; rerun focused tests.
- [ ] Write editor tests first, implement route-local form/state/styles and links; run focused tests.
- [ ] Add HTTP integration and browser tests for creation, sparse edits, errors, delete, sessions and navigation.
- [ ] Update listed docs and self-review against each acceptance criterion.
- [ ] Run `npm test -- --watch=false`, `npm run build`, and `npm run verify` (Edge permitted locally).
- [ ] Start `npm start`; inspect affected local flows. Browser fixtures exercise real frontend/API boundaries; local backend smoke if available, otherwise explicitly record limitation.
- [ ] Inspect desktop/mobile light/dark screenshots, keyboard focus, validation, permissions and failure/retry.
- [ ] Commit/push and create PR to develop with `Closes #86`, plan and evidence.
- [ ] Post exactly `@codex review`, record URL; inspect CI/reviews and address valid findings, repeat validation and request review after fixes.
- [ ] Merge/deployment are outside the requested raise-PR scope; leave issue open pending merge.

## Validation evidence
Pending. Record expected red tests, passing counts and browser evidence here.

## Delivery
PR and review URLs pending. No merge or deployment claimed.
