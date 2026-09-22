# Issue #93: Current-user profile and account identity

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/93
- Branch: issue/93_current-user-profile; clean synchronized develop ceaaab42a1a748e03372885b7a4215670b7d18ac.
- Reuse AuthService and GET users/me (CurrentUser: id/name/email). Read-only profile; no PATCH, image upload, global user lookup or new authentication flow.
- Read engineering/testing standards, issue, existing auth/session/interceptor/router/navbar/workspace implementation, public assets, backend API_CONTRACT and PROJECT_REFERENCE. No profile-specific Penpot board is linked or documented; retain existing shell and semantic theme tokens, using a simple account details panel.
- No schema or backend contract changes. Mocked API checks are not deployed-backend verification.

## Acceptance criteria and tests
| Criterion | Test/check | Expected |
| --- | --- | --- |
| Shared typed identity | current-user.spec.ts: restoration caches identity, refresh shares pending request | One users/me request and one shared snapshot |
| Loading/error/retry/empty | current-user.spec.ts and profile.spec.ts | Hide stale identity, safe error and retry, reject malformed DTO |
| Read-only safe text | profile.spec.ts and profile.smoke.spec.ts | Real name/email rendered literally; no Save/upload controls |
| Session expiry and switching | current-user.spec.ts and profile.integration.spec.ts | Clear identity immediately; old responses cannot restore old account or log out new account |
| Account consistency | profile.integration.spec.ts and browser smoke | Profile and navbar use the same refreshed identity |
| Responsive/accessibility | browser smoke desktop/mobile light/dark | No overflow, keyboard refresh and menu Escape/focus work |

## Design and implementation order
Extend AuthService with session-bound current-user state, deduplicated refresh and response validation; reuse restoration response. Navbar loads after login and displays shared identity in desktop/account menu. Profile shows heading, read-only name/email, refresh, loading and errors. Use existing colors and responsive shell. Never persist identity or render HTML. Keep existing authentication APIs intact.
Affected files: services/auth-service.ts; pages/profile/*; elements/navbar/*; testing/profile.integration.spec.ts; services/current-user.spec.ts; e2e/profile.smoke.spec.ts. Update README, architecture, design, testing and TODO docs. Backend docs need no contract change.

## Ordered execution checklist
- [x] Read issue/contracts/implementation/assets/rules and verify latest develop.
- [x] Create isolated issue branch, update TODO, commit initial plan before code/tests.
- [x] Write tests first; run npm test -- --watch=false --include=src/app/services/current-user.spec.ts and record behavior failures.
- [x] Implement typed shared identity/session state; rerun service tests.
- [x] Write component/integration tests before UI implementation; add browser coverage and record behavior failures. Browser tests followed the initial UI, exposing and reproducing focus loss before its fix.
- [x] Implement read-only profile and consistent navbar with semantic styles.
- [x] Run focused tests; update architecture/design/testing/README/TODO and evidence.
- [x] Run npm test -- --watch=false and npm run verify (unit/integration/build/browser).
- [x] Start npm start; inspect desktop/mobile/light/dark screenshots, keyboard and API fixtures; document live backend availability.
- [x] Self-review security, scope, contracts and acceptance criteria; commit validated implementation.
- [ ] Create PR to develop with Closes #93 and plan link; request @codex review and record URL.
- [ ] Inspect checks/review; address findings and rerun gates as needed.
- [ ] Merge/deployment remain outside this request to raise a PR; keep unverified steps pending.

## Validation evidence
Pending; record actual commands/counts and red/green results here.

## Plan changes and resume notes
2026-09-22: isolated worktree created from freshly fetched origin/develop before reading the detailed synchronization rule; then fast-forwarded clean develop and verified both SHAs match before any edits. No profile-specific design board exists in supplied references; shared shell composition remains unchanged.

## Delivery
PR/review/checks pending. No merge requested.

### Implementation evidence and adjustments
- Initial focused run: 2 expected behavior failures (AuthService lacked currentUser; Profile still rendered placeholder).
- Expanded focused run: 15 passes and one integration assertion required awaiting the shared refresh promise. Workspace route fixture now supplies users/me when visiting Profile. Subsequent unit/integration: 102 + 7 passed.
- First browser run exposed focus loss when native disabled was applied during refresh. Replaced it with aria-disabled plus an activation guard; pending requests remain deduplicated and the focused control stays in the tab order. Retain the keyboard regression assertion.
- npm start -- --host 127.0.0.1 --port 4301 built and served /profile with HTTP 200. Browser flows run against the production build with isolated API fixtures. No live backend account was supplied; unchanged backend contract/deployment is not claimed as validated.
- npm ci completed from lockfile; npm reported 30 dependency audit findings in the existing locked dependency tree. Dependency upgrades are outside this issue.


### Final local validation (2026-09-22)
- npm run verify with PLAYWRIGHT_CHANNEL=msedge: 102 unit tests (24 files), 7 integration tests (3 files), production build (492.22 kB, below warning budget), and 32 browser tests passed.
- npm test -- --watch=false: all 109 tests across 27 files passed.
- Visually inspected profile screenshots at desktop 1280px and mobile Pixel 7 widths, both light/dark: readable name/email, clean wrapping, no overflow, visible keyboard focus. Existing shell/brand assets retained; no profile-specific Penpot board supplied.
- API fixtures cover success, loading, retry, 401/403/404, server/network failures and session races. API contract unchanged; no live backend/deployment verification performed.
- Final diff self-review: scope stays read-only; no secrets, HTML rendering, schema/API mutation or dependency changes. git diff --check passed. Develop was re-fetched and remains ceaaab4.
