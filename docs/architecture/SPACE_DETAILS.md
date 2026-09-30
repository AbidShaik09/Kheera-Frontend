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

## Space lifecycle routes (#86)

`/spaces/new` is ordered before the UUID route. `/spaces/:spaceId/settings` reads
SpaceDetail without fetching projects. The sidebar creates spaces; Space Details
exposes settings when either canUpdate or canDelete is true. Settings independently
honors both capabilities and the backend remains authoritative.

SpaceLifecycleService owns GET/POST/PATCH/DELETE through ApiService and rejects
responses from a replaced session. SpaceEditor keeps route-local drafts and guards
async completions with route generation/session identity. It prevents duplicate
writes, validates Unicode code-point limits (name 255, description 500, URL 255),
and accepts only absolute credential-free HTTP(S) picture URLs. This is not upload.
POST omits empty optional values and navigates using the returned UUID. PATCH compares
against loaded metadata, sends changed fields only, and uses null for optional
clearing. Name is trimmed and never null. Named server fieldErrors render as text.

Successful writes refresh WorkspaceService. DELETE requires a named confirmation,
accepts 204 and navigates to dashboard. Route-scoped detail/project state is destroyed
when leaving its page; the editor clears its draft/metadata on deletion, read access
loss, logout and teardown. No persistent descendant cache or restore action exists.
Creation 403 retains the draft and disables further submissions for that form session.
Mutation 403 preserves input while disabling the denied action; Refresh permissions
revalidates capabilities without replacing the draft. Read 403/404 and mutation 404
clear resource state. Recoverable failures preserve input and permit retry; current
401 expires the session. Stale navigation/session results cannot navigate or publish.

## Space People (#87)

`/spaces/:spaceId/people` loads metadata independently of the membership directory.
Members use 25-item pages, name/email search and supported server sorts. Roles and
permissions load every 100-item catalogue page; no role or permission editing is exposed.
The catalogues and `canManageMembers` are not effective grants. The backend authorizes
each add/change-role/remove action and grant subset; 403 is rendered honestly.

Writes use membership UUIDs, never user UUIDs. Adding an existing account trims its
exact email; there is no invitation flow. Duplicate and last-administrator conflicts
preserve drafts. Successful changes reload membership/catalogue/space state and the
workspace list. Self-removal clears local state and returns to Dashboard; self-demotion
revalidates directory access. Session epochs and page generations reject stale results.

The API supplies historical user identity on current memberships; historical task author
and assignee presentation remains owned by task features. No task history is rewritten.

## Project lifecycle (#89)

Space Details exposes Create project when SpaceDetail.canUpdate is true, routing to
`/spaces/:spaceId/projects/new`. Project overview links `/projects/:projectId/settings`.
Settings re-read the project and its actual parent space before showing actions; no query
parameter can reparent a project or supply authorization. Space update/delete grants map
to project create/update/delete according to the merged backend #68 contract.

ProjectLifecycleService owns requests and validates IDs, response identity and session
continuity. Draft validation counts Unicode code points for the 255-character name and
500-character description. Sprint cycle values are positive 32-bit integers; blank creation
uses the server default of 7. Legacy null cycle values remain unchanged unless supplied.
PATCH contains changed fields only; null clears description and no space/metric fields are sent.

Route/session changes clear editor state; late responses cannot populate a different context.
Recoverable failures preserve drafts. A denied mutation disables its action and revalidates
project/space access; failed revalidation hides stale controls until retry. Inaccessible
resources clear the draft. Deletion confirms project identity and descendant inaccessibility,
accepts only 204, and navigates to the parent space. Route-scoped summary/list providers are
recreated there, so project lists reload; no persistent task cache exists to retain descendants.
Server progressPercent/openTaskCount are displayed without frontend completion assumptions.
