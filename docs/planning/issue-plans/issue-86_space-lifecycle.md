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
| Capabilities/server authority | lifecycle browser tests | separate update/delete controls; 403 revokes writes without losing draft |
| Delete confirmation and failure | lifecycle browser/request unit tests | identity and descendant warning, 204 dashboard, retry on failure |
| Session/navigation races | lifecycle request unit/router integration tests | old responses ignored, current 401 logout, cleared route state |
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
- [x] Commit initial plan and TODO before tests/application code.
- [x] Write failing validation/service and entry-point tests; run `npm test -- --watch=false --include="**/space-lifecycle*.spec.ts" --include="**/space-details.spec.ts"`; record behavior failures.
- [x] Implement typed lifecycle service; rerun focused tests.
- [x] Write editor tests first, implement route-local form/state/styles and links; run focused tests.
- [x] Add HTTP integration and browser tests for creation, sparse edits, errors, delete, sessions and navigation.
- [x] Update listed docs and self-review against each acceptance criterion.
- [x] Run `npm test -- --watch=false`, `npm run build`, and `npm run verify` (Edge permitted locally).
- [x] Start `npm start`; inspect affected local flows. Browser fixtures exercise real frontend/API boundaries; local backend smoke if available, otherwise explicitly record limitation.
- [x] Inspect desktop/mobile light/dark screenshots, keyboard focus, validation, permissions and failure/retry.
- [x] Commit/push and create PR to develop with `Closes #86`, plan and evidence.
- [ ] Post exactly `@codex review`, record URL; inspect CI/reviews and address valid findings, repeat validation and request review after fixes.
- [ ] Merge/deployment are outside the requested raise-PR scope; leave issue open pending merge.

## Validation evidence
- Initial plan committed as `36f323f` before implementation.
- `npm test -- --watch=false --include="**/space-lifecycle*.spec.ts" --include="**/space-details.spec.ts"`: initial 10 expected behavior failures (payload/validation and settings entry point), 3 passed. Minimal service skeleton compiled; no setup failure counted as red evidence.
- Create-route regression before editor: 1 expected missing-form failure, 10 payload tests passed. Follow-up focused run: 24 passed. Expanded integration coverage caught async render timing in tests; waits now observe actual rendered state.
- `npm test -- --watch=false`: 169 tests passed in 34 files.
- `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run verify`: PASS, 154 unit tests / 29 files, 15 integration tests / 5 files, production build and 72 browser tests / desktop+mobile. Final implementation tested on 2026-09-27; resumed 2026-09-28 with unchanged code and verified logs.
- Production initial bundle 515.29 kB; existing 500 kB warning remains below the 1 MB error threshold. No dependency changes.
- `npm start -- --host 127.0.0.1 --port 4301`: development compilation passed; GET `/spaces/new` returned 200. Browser tests exercised the production app with isolated HTTP contract fixtures.
- Inspected settings screenshots in desktop/mobile light/dark mode, including wrapped identity and URL help. Fixed primary hover background for dark/mobile legibility; final verify includes the fix. Keyboard tests cover invalid-field focus, Enter, confirmation Cancel focus and Escape return focus. No horizontal overflow.
- API limitation: localhost:8080 returned 404 for `/api/health`, `/api/spaces`, and `/v3/api-docs`; this listener is not a usable Kheera backend. No configured disposable authenticated backend was available. No live backend or deployment verification is claimed. Payloads were checked against current backend DTO/controller contracts and through the real Angular HTTP/interceptor layers.
- `git diff --check`: passed. Fresh fetch on 2026-09-28 showed no new develop commits to integrate.

## Plan changes and resume notes
- Dedicated settings component assertions are covered through the real router/HTTP integration and browser tests, avoiding a second mocked version of the same form behavior.
- Frontend docs own the new routes and API consumption. Backend contracts/schema remain unchanged; cross-repository release history is deferred until merge/deployment.
- No specific create/settings Penpot frame or direct board URL is supplied; layout preserves the documented shell and Space Details identity hierarchy.

## Delivery
- PR: https://github.com/AbidShaik09/Kheera-Frontend/pull/99 (base develop).
- Initial review request accepted: https://github.com/AbidShaik09/Kheera-Frontend/pull/99#issuecomment-5862909832.
- Implementation commit: `d5abb7c22cf22f6e3a2bbf85326c7868553ebbdc` (plus initial plan `36f323f`).
- Hosted Frontend checks and Codex review were pending at PR creation. This delivery-record update changes documentation only; implementation validation above remains current.
- No merge, issue closure or deployment requested/performed. Review and CI results remain authoritative on the PR.


### Final self-review correction (2026-09-28)
An unchanged optional description stored as an empty string was normalized to null
while editing another field. Added a failing payload regression (1 failed / 12 passed)
and changed comparison to the original displayed optional value before normalization.
Explicit clearing of a nonempty value still sends null. Re-running full validation;
earlier counts are superseded for this one-line payload correction.


### Review triage
- Thread https://github.com/AbidShaik09/Kheera-Frontend/pull/99#discussion_r4118370503:
  **real**. A denied POST was classified as update, but create mode has no metadata
  capability to revoke. Added explicit creationDenied state and submit guards while
  preserving draft input. Regression initially failed because submit remained enabled
  (1 failed / 5 passed). Browser coverage also checks one POST and preserved input.
- The initial hosted verify check passed on bb2341e. Full local verification and
  fresh review are required after these two corrections.


### Correction validation (2026-09-28)
- Full Angular regression: `npm test -- --watch=false` passed 171 tests / 34 files.
- `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run verify` passed 155 unit tests,
  16 integration tests, production build and 74 desktop/mobile browser tests.
- Both new regressions pass: unchanged empty optional metadata remains omitted;
  denied creation preserves its draft and blocks repeated POSTs, including direct
  form submission. Existing explicit-null, capability, session and deletion tests pass.
- Review fix and self-review correction are committed together. A fresh Codex review
  is requested on the updated head; CI/review completion remains tracked on PR #99.
