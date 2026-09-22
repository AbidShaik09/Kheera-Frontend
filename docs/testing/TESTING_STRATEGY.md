# Frontend testing strategy

## Required workflow

Before each feature, synchronize develop, commit its issue plan, and write behavior tests first. Run the targeted test and record the expected failure; compilation/setup failures are not TDD evidence. Implement the smallest working behavior, rerun the target, then complete the full gates. Keep red/green evidence in the issue plan.

| Layer | Command | Boundary |
| --- | --- | --- |
| Unit | `npm run test:unit` | Vitest/Angular TestBed; mock collaborators and test observable state/forms |
| Integration | `npm run test:integration` | Real Angular services/interceptors/router with HttpTestingController at the HTTP boundary |
| Full Angular regression | `npm test -- --watch=false` | Both unit and integration specs |
| Production build | `npm run build` | Angular production compilation and bundle budgets |
| Browser smoke | `npm run test:smoke` | Playwright Chromium, production build, desktop/mobile, isolated API fixtures |
| All gates | `npm run verify` | Unit, integration, production build, browser smoke in order |

Install with `npm ci`, then `npx playwright install chromium` (CI uses `--with-deps`). Browser smoke starts and stops its own loopback-only server on 4300; it fails if another server owns the port. No production accounts, JWTs, SMTP or external business APIs are used. Browser tests live in e2e; Angular integration files end in .integration.spec.ts. No empty-suite success, test skipping or blanket retries to hide failures.

On Windows, an already installed Microsoft Edge can also run the same Chromium smoke suite with `$env:PLAYWRIGHT_CHANNEL='msedge'; npm run test:smoke`. Record this browser choice in evidence. CI continues to use Playwright's bundled Chromium.

Integration tests join real frontend layers but mock the network: they are not full-stack/backend integration proof. For changed API contracts also run an authorized local backend smoke with disposable fixtures when available, recording any unavailable environment honestly. Backend persistence/migration verification stays in the backend repository.

## Smoke and acceptance checks

Every affected journey must cover success and useful failure states, 401/403/404, no-data onboarding, stale requests, refresh/back/deep links and logout where relevant. Check keyboard/focus, desktop/mobile, and light/dark mode against the documented design. Add feature-specific smoke journeys alongside implementation. Fixtures represent the published backend DTO, not a replacement product contract.

The smoke server serves only the production build, provides a safe local config and rejects unmocked API requests. Traces on failure live in test-results (ignored locally, uploaded by CI). Do not include credentials or private data in fixtures/traces.

## Continuous integration and deployment

Frontend checks runs unit, integration, build and browser smoke on PRs to develop/main and pushes to those branches, on a hosted runner with read-only repository permissions. A failing step fails the check. The workflow does not execute untrusted PR code on the deployment machine.

Branch protection and deployment ordering are separate controls: this workflow alone does not make checks mandatory or gate the legacy self-hosted deployment jobs. CI/deployment safety remains tracked by backend #55; do not claim deployment is protected until that work is verified. Required review and repository merge rules remain in effect.

Validation evidence must name commands, counts, commit/state, initial expected failures and final pass/fail. After fixes, rerun affected regressions and the complete verification gates. Never report mocked smoke as verification of the deployed backend.

## Workspace navigation coverage

Issue #85 adds service tests for GET spaces shape/error/session races, real router
and HTTP integration, and desktop/mobile browser journeys for URL selection,
Back/reload, empty accounts, retry, revoked access, sign-out and cross-tab account
changes. Browser screenshots cover light/dark mode; review them against the Penpot
dashboard composition. The initial testing-workflow CI run
[35604677013](https://github.com/AbidShaik09/Kheera-Frontend/actions/runs/35604677013)
passed all hosted Chromium gates.

## Initial validation (2026-09-21)

Clean npm ci succeeded. Unit suite: 68 passing tests in 20 files. HTTP integration: 2 passing tests. Production build passed with the existing 550.32 kB initial-bundle warning (500 kB warning / 1 MB error budget). Browser smoke: 4 passing tests across desktop/mobile using installed Edge; the bundled Chromium download timed out locally. Hosted Chromium CI must also pass. No product feature implementation is included in this setup baseline. The setup was requested on develop before issue implementation.

