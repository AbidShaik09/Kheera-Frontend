# Space Details and project navigation (#63)

## Routes and contracts

`/spaces/:spaceId` loads space metadata and a page of projects inside WorkspaceShell.
Sidebar space links now target this route; the UUID path controls selection even if an
old `space` query parameter is present. Legacy `/dashboard?space=UUID` context remains
readable without falsely marking a Space Details link as the current page. Account
navigation preserves the current space; project overview ignores unrelated query context.

`SpaceDetailService` owns GET `spaces/{spaceId}` and GET
`spaces/{spaceId}/projects?page=N&size=12&sort=name,asc`. API URLs use the existing
runtime `/api/` prefix and bearer interceptor. The typed DTOs match backend develop
102f3f1: SpaceDetail has timestamps and canUpdate/canDelete/canManageMembers;
ProjectSummary has spaceId, sprintCycleDays, progressPercent and openTaskCount.
PageDto contains items/page/size/totalItems/totalPages. Runtime checks reject malformed
or mismatched identities, pages and metrics rather than rendering misleading results.

The `page` query parameter is zero-based and survives reload/back. Invalid query pages
fall back to page zero; an out-of-range but valid page offers First page. Only API totals
and metrics are shown. Empty projects and unavailable projects are separate states.

## State and access

Each routed component provides its own service. Space changes and page refreshes clear
previous data; teardown invalidates pending work. Requests capture session epoch/token
and generation. Computed state hides data synchronously on logout/account changes.
Older responses cannot publish or expire a replacement session.

Metadata and projects load independently. A project failure does not hide valid metadata.
Project 403/404 revalidates the space; failed metadata clears project data and capabilities.
A current 401 signs out through AuthService. No membership directory request is made,
so permission to read People does not gate metadata. Images accept only absolute HTTP(S)
URLs without credentials, suppress referrers and disappear on load failure; user copy
is interpolated as text. No identity or space data is persisted by these services.

## Boundaries and follow-on work

Space settings and People management controls are capability-aware and explicitly
marked coming soon until #86/#87 supply their actual editors. No role-name inference,
mutation, upload, fake member list or unsupported restore action is introduced.

Project cards navigate to `/projects/:projectId`, a guarded, API-backed read-only summary
with progress/open counts and a link to its actual parent space. #64 owns the task board;
#89 owns project writes. The summary provides a working destination without a fake board.
Future implementations should reuse the exported DTO/validation and replace this
summary route rather than adding competing project routes.

## Design and verification

The documented Penpot Space Details hierarchy is retained: existing top/left shell,
space identity and description, metadata and capability actions, then project cards
with metrics. Cards and metadata wrap on narrow screens and use semantic theme tokens.
The repository has no exact Space Details board URL; visual verification uses the
written PROJECT_REFERENCE and existing theme, not a claimed pixel comparison to an
unavailable board. Unit, HTTP/router integration and browser fixtures exercise access,
stale requests, pagination, real navigation, retry, light/dark and mobile/desktop.
Backend contracts are unchanged; fixture-based checks do not prove live deployment.
