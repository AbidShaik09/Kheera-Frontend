# Issue #87: Space members and catalogues

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/87
- Branch: `issue/87_space-members`; synchronized develop `a394abd7190b1a384fa92408c3b861f050b2b977`.
- Implement People at `/spaces/:spaceId/people`: paginated searchable/sortable members, existing-account addition, role changes, confirmed removal, read-only roles/permissions.
- Backend origin/develop MembershipController, MembershipDto and MembershipService confirm merged #67 contract. No invitation, global directory or role editing.
- No People-specific Penpot board is supplied. Reuse workspace shell, Space Details hierarchy and semantic form tokens.
- Permission catalogue is not effective grants; server decides each mutation. Do not infer authority from role names or canManageMembers.

## Acceptance criteria and tests
| Criterion | Test / check | Expected |
| --- | --- | --- |
| Pagination/search/sort | membership-service.spec.ts query tests | page 0, size 25, all supported sort fields, bounded q |
| Add/rejoin/duplicate | membership-service.spec.ts mutation tests; People integration/browser | exact trimmed email and roleId; preserve failed draft |
| Membership IDs | service mutation tests | PATCH/DELETE membership ID, never user ID |
| Catalogues | service pagination tests | load all role and permission pages, read-only rendering |
| Denied/conflict/access loss | integration tests and browser | clear denied reads; retain failed mutation draft; refresh authority |
| Self removal/demotion | integration tests | refresh metadata/workspace; leave removed space |
| Races/session | service/component tests | ignore late responses and clear private state |

## Design and affected files
- `services/membership-service.ts`: typed transport, validated page contracts, catalogue pagination and mutations.
- `pages/space-people/*`: view state, form validation, confirmation, route/session lifetime and independent metadata.
- Routes and Space Details People link; existing shell retains breadcrumbs.
- Tests beside service and in `testing/` and `e2e/` cover real service/HTTP integration and browser journeys.
- Update README, architecture/SPACE_DETAILS.md, design/STYLE_GUIDE.md, testing/TESTING_STRATEGY.md and planning/IMPLEMENTATION_TODO.md.
- No persistence/schema migration. Cancellation generations prevent cross-space/session response reuse. Server remains authoritative.

## Ordered execution
- [x] Inspect issue, synchronized baseline, rules, components and merged backend contracts.
- [x] Commit initial plan and TODO before application/tests.
- [x] Write service behavior tests; record expected failing run before implementation.
- [x] Implement transport and verify focused tests.
- [x] Write failing integration requirements before People implementation; add browser coverage for the completed flow.
- [x] Implement People state, route, semantic responsive UI and entry point.
- [x] Verify targeted tests; update all relevant documentation.
- [x] Run `npm run verify` with `PLAYWRIGHT_CHANNEL=msedge` (unit, integration, production build, browser smoke).
- [x] Start local development server; inspect desktop/mobile, light/dark screenshots and keyboard/focus; fixture API success/failure checks are not deployed-backend evidence.
- [x] Self-review every criterion and security/session behavior; repair and rerun affected/full checks.
- [x] Commit/push branch; create PR targeting develop with Closes #87 and plan link.
- [ ] Request `@codex review`, record URL, inspect CI/reviews and fix actionable findings with renewed validation.
- [ ] Merge/deployment pending separate authorization; do not claim issue closure or deployed validation.

## Evidence and delivery
- Initial plan committed as f402502 before application/tests.
- Service red: 6 expected behavior failures with placeholder transport; green: initial 7 tests passed. Added unauthorized, bounds and malformed response tests; final service total 9.
- People integration red: 2 expected missing route/form failures. Final: 2 passed with real router, service, HTTP and bearer interceptor.
- `PLAYWRIGHT_CHANNEL=msedge npm run verify`: 164 unit tests (30 files), 18 integration tests (6 files), production build and 82 browser tests passed. Local log: `../issue87-verify.log` (not committed).
- Production initial bundle 520.34 kB; pre-existing 500 kB warning (previous issue recorded 515.29 kB) remains below the 1 MB failure budget. No dependency changes.
- `npm start -- --host 127.0.0.1 --port 4301` compiled successfully. Production browser smoke used the standard local smoke server.
- Inspected desktop/mobile light/dark screenshots. No horizontal overflow; keyboard Enter search, confirmation heading focus and Cancel focus restoration passed. Fixtures cover successful writes, duplicate membership, last-administrator protection, denied directory and self-removal.
- API verification is against merged controller/DTO/service source and local HTTP fixtures, not a deployed-backend claim. No exact People Penpot board was supplied.
- Self-review: typed transport owns HTTP, scoped paths use membership IDs, catalogue pages are validated, stale sessions are ignored, route lifetime clears state; no new dependencies, secrets, invitations or custom-role editing.
- Browser tests were added after route implementation; the route and service acceptance tests were written and run failing first.
- PR: https://github.com/AbidShaik09/Kheera-Frontend/pull/101 (develop). Initial review request accepted: https://github.com/AbidShaik09/Kheera-Frontend/pull/101#issuecomment-5884323581. CI/review pending; merge/deployment are outside the requested raise-PR endpoint.

## Review correction
- Codex thread PRRT_kwDOSlID6c6m-QDa was valid: a failed current-user lookup kept removal disabled. Refresh People now retries failed profile loads and displays recovery guidance.
- Regression first failed because no profile retry request was issued; after the fix, full verify passed 164 unit tests, 19 integration tests, production build and 82 browser smoke tests. Evidence: ../issue87-review-verify.log.
- Initial GitHub verify passed on 91568a3. Updated-head CI/review remains pending after pushing the correction.

- Codex thread PRRT_kwDOSlID6c6nKm7D was valid: shrinking member totals could leave the current page out of range. A regression first failed with page 2 instead of 0; load now clamps to the last valid server page and reloads.
- Final pagination correction validation: 164 unit tests, 20 integration tests, production build and 82 browser tests passed (../issue87-pagination-verify.log).

- Codex thread PRRT_kwDOSlID6c6nKz_i was valid: a mutation 404 could retain a concurrently deleted membership/role. After confirming continued space access, the page now reloads members and catalogues and clears obsolete confirmation while preserving the add-user draft.
- Regression first failed because no member refresh followed the 404. Full corrected verification passed 164 unit tests, 21 integration tests, production build and 82 browser tests (../issue87-stale-target-verify.log).

- Resumed 2026-09-30, fetched develop and confirmed no upstream changes. Review thread PRRT_kwDOSlID6c6nLCF1 was valid: directory permission can be revoked independently of ordinary space access. Both mutation 403 and 404 now reload protected directory/catalogue state after space revalidation.
- Regression first failed because a 403 did not trigger membership reload. Final verify passed 164 unit tests, 22 integration tests, production build and 82 browser tests (../issue87-permission-verify.log).
