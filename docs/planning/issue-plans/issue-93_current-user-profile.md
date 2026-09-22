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
- [ ] Write tests first; run npm test -- --watch=false --include=src/app/services/current-user.spec.ts and record behavior failures.
- [ ] Implement typed shared identity/session state; rerun service tests.
- [ ] Write component/integration/browser tests before UI implementation; record behavior failures.
- [ ] Implement read-only profile and consistent navbar with semantic styles.
- [ ] Run focused tests; update architecture/design/testing/README/TODO and evidence.
- [ ] Run npm test -- --watch=false and npm run verify (unit/integration/build/browser).
- [ ] Start npm start; inspect desktop/mobile/light/dark screenshots, keyboard and API fixtures; document live backend availability.
- [ ] Self-review security, scope, contracts and acceptance criteria; commit and push.
- [ ] Create PR to develop with Closes #93 and plan link; request @codex review and record URL.
- [ ] Inspect checks/review; address findings and rerun gates as needed.
- [ ] Merge/deployment remain outside this request to raise a PR; keep unverified steps pending.

## Validation evidence
Pending; record actual commands/counts and red/green results here.

## Plan changes and resume notes
2026-09-22: isolated worktree created from freshly fetched origin/develop before reading the detailed synchronization rule; then fast-forwarded clean develop and verified both SHAs match before any edits. No profile-specific design board exists in supplied references; shared shell composition remains unchanged.

## Delivery
PR/review/checks pending. No merge requested.
