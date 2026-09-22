# Issue #63: Space Details and live project list

## Scope and baseline
- Issue: https://github.com/AbidShaik09/Kheera-Frontend/issues/63
- Branch issue/63_space-details from synchronized clean develop db2cea03ad4335bd2ab6910c302ad9bd47b163eb.
- Backend develop 102f3f1 includes merged #68 project APIs; the issue's project-list blocker is stale. Read SpaceLifecycleController, ProjectController, SpaceDetailDto, ProjectSummaryDto, PageDto and ProjectService.
- GET spaces/{id}: id/name/description/profilePic/createdAt/updatedAt/capabilities (canUpdate/canDelete/canManageMembers).
- GET spaces/{id}/projects: items/page/size/totalItems/totalPages; each item id/spaceId/name/description/sprintCycleDays/progressPercent/openTaskCount/updatedAt. GET projects/{id} supports a read-only navigation destination, not the #64 task board.
- No backend writes, membership directory calls, task-board implementation or project mutation. Future #86/#87 controls are capability-aware, explicitly unavailable entry points until those slices land; never link to nonexistent editors.
- Read existing engineering/testing rules, issue/comments, TODO, shell/routes/services/specs, public assets and documented Penpot composition. No Space Details board URL is supplied; asked the user for it while working on independent API/state implementation. Preserve existing shell, identity/description metadata and project-card hierarchy.

## Acceptance criteria and tests
| Requirement | Named tests / checks | Expected |
| --- | --- | --- |
| Space identity and capabilities | space-details.integration.spec.ts: loads protected metadata and projects; space-detail-service.spec.ts validation | Correct DTO, safe image URL/text/timestamps; gated future settings/People controls |
| Independent projects | service spec: project failure preserves metadata; smoke retry | Distinct loading/error/empty/ready, no fabricated metrics or directory dependency |
| Pagination and links | service/integration/smoke: next/back/reload and project summary | API page parameters, counts/progress, real /projects/:projectId destination; board remains #64 |
| Access loss/session races | service tests 401/403/404, switch/session/logout/destroy races | No stale metadata/projects; no old 401 logs out replacement user |
| Deep link/navigation | router integration and browser smoke | UUID validation, protected routes, sidebar current-page correctness and back/reload |
| Responsive/safe UI | browser smoke light/dark desktop/mobile and keyboard | Literal text, safe HTTP(S) image fallback, no overflow, focus retained on pagination/refresh |

## Architecture and files
- New services/space-detail-service.ts owns typed reads and per-component state. Capture request generation, session epoch/token, selected space and page; clear on route changes/access loss. Separate metadata and project state; metadata failure invalidates children. Project 403/404 revalidates metadata to distinguish unavailable project service from revoked space access.
- New pages/space-details uses route params/query page and owns navigation only. New pages/project-summary is a guarded read-only summary handoff to #64 using GET projects/{id}; never fake a task board.
- app.routes.ts and workspace-shell adapt sidebar links to /spaces/:spaceId, preserve legacy dashboard query context, and avoid blocking resource routes with query-only workspace state. Active links follow the actual route.
- Update README, architecture, design, testing, TODO and this plan. API contracts unchanged; frontend owns new consumer documentation. No cross-repository mutation required.

## Ordered checklist
- [x] Synchronize develop; read issue and current backend contracts; create isolated branch.
- [x] Write plan and update TODO; commit before application/test edits.
- [ ] Write router/service/component/browser behavior tests before implementation; run focused tests and record actual behavior failures.
- [ ] Implement typed state and validation, session isolation, independent metadata/projects and pagination; run focused tests.
- [ ] Implement route surfaces, sidebar/navigation, semantic theme styles, safe images and future capability entry points.
- [ ] Run focused tests, full npm test -- --watch=false and npm run verify (unit, integration, build, browser).
- [ ] Start npm start; verify desktop/mobile, light/dark, keyboard/focus, API fixtures and errors; inspect screenshots against available design guidance. Record any unavailable live backend/design evidence.
- [ ] Update documentation/TODO/plan and self-review all criteria; fix failures and rerun invalidated gates.
- [ ] Commit/push issue branch and raise PR to develop with Closes #63 and plan/evidence.
- [ ] Request @codex review, record URL, inspect CI/review and fix valid findings with fresh validation.
- [ ] Merge/deployment only with applicable authorization; not part of the request to implement and raise a PR.

## Validation / deviations / delivery
Pending. Initial plan committed before implementation. Design-link clarification is optional for independent API/state work; final visual evidence must state the source actually inspected.
