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
- [ ] Commit initial plan and TODO before application/tests.
- [ ] Write service behavior tests; record expected failing run before implementation.
- [ ] Implement transport and verify focused tests.
- [ ] Write integration/browser requirements before People implementation.
- [ ] Implement People state, route, semantic responsive UI and entry point.
- [ ] Verify targeted tests; update all relevant documentation.
- [ ] Run `npm run verify` with `PLAYWRIGHT_CHANNEL=msedge` (unit, integration, production build, browser smoke).
- [ ] Start local development server; inspect desktop/mobile, light/dark screenshots and keyboard/focus; fixture API success/failure checks are not deployed-backend evidence.
- [ ] Self-review every criterion and security/session behavior; repair and rerun affected/full checks.
- [ ] Commit/push branch; create PR targeting develop with Closes #87 and plan link.
- [ ] Request `@codex review`, record URL, inspect CI/reviews and fix actionable findings with renewed validation.
- [ ] Merge/deployment pending separate authorization; do not claim issue closure or deployed validation.

## Evidence and delivery
Pending implementation and verification. PR/review links and exact results will be recorded here.
