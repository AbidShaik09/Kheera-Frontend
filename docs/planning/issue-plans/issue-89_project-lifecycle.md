# Issue #89: Project lifecycle within spaces

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/89
- Branch: issue/89_project-lifecycle; synchronized develop: 438b43eff7206b77bc107d47cfdd41fb32e97a8a.
- Outcome: create from Space Details, edit from Project settings, confirm soft deletion and return to the parent space. Use server metrics and UUID navigation.
- Backend #68 is merged despite stale issue prose. Reviewed current ProjectController, ProjectWriteRequest, ProjectSummaryDto and ProjectService. Create/update require space.update; delete requires space.delete. SpaceDetail canUpdate/canDelete mirror those grants; server is authoritative.
- Create defaults sprintCycleDays to 7; explicit values must be integer 1..2147483647. Name trimmed 1..255 Unicode code points, description <=500. PATCH omission preserves; null clears description only; never send spaceId or metrics.
- Existing route-scoped project/space services are destroyed on navigation; no persistent task cache exists. Returning to a space recreates its live project list. No board, sprint records, project links or task CRUD changes.
- No project create/settings Penpot frame supplied. Reuse shell, project overview and semantic Space editor tokens, assets and accessible form patterns.

## Acceptance and named tests
| Requirement | Test location and behavior | Expected |
| --- | --- | --- |
| Request contract/validation | project-lifecycle-service.spec.ts: Unicode limits, integer bounds, sparse PATCH and null clearing | Valid payloads; no reparenting/metrics |
| Scope/identity | service tests: returned UUID, wrong space/project response | Only authorized exact context consumed |
| Lifecycle/errors | project-lifecycle.integration.spec.ts: create/edit/delete, 400/403/404/401 and retry | Preserve recoverable drafts, revoke stale controls/data, confirm 204 |
| Races | integration/service session/navigation tests | Ignore previous project/account responses |
| Entry points/metrics | browser project-lifecycle.smoke.spec.ts | Space-scoped creation, settings, server metrics, refreshed list |
| Accessibility/theme | desktop/mobile light/dark browser journeys | Keyboard validation focus, confirmation/cancel focus, no overflow |

## Design and files
- services/project-lifecycle-service.ts owns typed read/create/update/delete and space capability reads; validates transport responses and session continuity.
- pages/project-editor/* owns form/loading/error/confirmation state; revalidates permissions on denied writes; clears inaccessible resources and guards in-flight navigation.
- app.routes.ts adds spaces/:spaceId/projects/new and projects/:projectId/settings; Space Details offers capability-aware create; Project overview links settings.
- Workspace shell treats project settings as project context so stale space query parameters cannot select another space.
- Update README, architecture/SPACE_DETAILS.md, design/STYLE_GUIDE.md, testing/TESTING_STRATEGY.md and planning/IMPLEMENTATION_TODO.md.

## Ordered execution
- [x] Read current issue, synchronized baseline, contracts, design references, implementation and tests.
- [x] Commit plan and TODO before application/test edits.
- [x] Write service behavior tests and run expected failing tests with compilable stubs.
- [x] Implement service/validation and run focused tests.
- [x] Write failing route integration and browser expectations before UI implementation.
- [x] Implement editor/routes/entry points and context handling; rerun targeted regressions.
- [x] Update documentation and self-review all criteria/security/cancellation behavior.
- [x] Run PLAYWRIGHT_CHANNEL=msedge npm run verify: unit, integration, production build, browser smoke; repair required failures and rerun.
- [x] Start npm start on loopback; inspect desktop/mobile light/dark screenshots and keyboard behavior. API fixtures are not deployed-backend evidence; no available authorized live test account is assumed.
- [x] Commit/push and create PR targeting develop with Closes #89 and plan/evidence.
- [ ] Post @codex review; inspect CI/reviews, fix findings and rerun affected/full checks; record review links.
- [ ] Merge/deployment remains outside the requested raise-PR endpoint; report actual state only.

## Evidence / resume notes
Plan committed first as b39b788. Service TDD: 18 expected failures with compilable stubs; initial route integration: 5 expected failures. Browser testing exposed Cancel/Escape focus restoration timing; after-render focus repair passed all lifecycle journeys. Final PLAYWRIGHT_CHANNEL=msedge npm run verify: 182 unit tests, 31 integration tests, production build, and 98 browser tests passed. Production bundle 520.65 kB retains the existing 500 kB warning and remains below the 1 MB error threshold. Development server compiled on loopback port 4301 and was stopped after verification. Inspected desktop/mobile screenshots in both light and dark themes; no overflow. Browser APIs use fixtures, not a deployed backend account. No exact project-editor Penpot frame was supplied; existing Space editor styles reused. No dependencies or schema changes. Created [PR #103](https://github.com/AbidShaik09/Kheera-Frontend/pull/103), targeting develop. Requested [Codex review](https://github.com/AbidShaik09/Kheera-Frontend/pull/103#issuecomment-5915572357); CI/review in progress at this documentation snapshot. Merge/deployment outside requested scope.
