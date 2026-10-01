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

Project cards navigate to `/projects/:projectId`, the guarded live task board from #64,
with progress/open counts and a link to its actual parent space. Project writes from
#89 and workflow settings from #88 have separate settings routes. Task creation/detail
remains #65; reuse the exported contracts and existing project route.

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

## Project workflow settings

`/projects/:projectId/workflow` loads the exact project, its parent-space capabilities, then its ordered workflow stages. `WorkflowStageService` is a stateless reusable transport adapter; the board (#64) calls its list method on entry/refresh rather than retaining outdated column metadata. No persistent task board cache exists. Settings re-fetch project, permissions and stages after every successful mutation and 409 conflict. Returning to the project board re-fetches completion metrics and stage metadata.

| Operation | API path beneath configured `/api/` | Body/result |
| --- | --- | --- |
| List | GET projects/{projectId}/workflow-stages | Ordered array `{id,name,icon,position,complete}` |
| Create | POST projects/{projectId}/workflow-stages | Name, icon, complete; optional position; 201 stage |
| Edit/reorder | PATCH projects/{projectId}/workflow-stages/{stageId} | Only changed fields; stage response |
| Delete | DELETE projects/{projectId}/workflow-stages/{stageId} | Confirmed empty-stage deletion; requires 204 |

All writes require `space.update`, represented by parent `canUpdate`; server authorization remains authoritative. Name is trimmed, 1–100 UTF-16 units; icon is optional, at most 255 UTF-16 units. Empty icon clears it. PATCH never sends null; omitted fields remain unchanged. Position is a non-negative 32-bit integer; omission appends on creation or preserves on edit, and oversized positions clamp on the server. Completion uses the boolean, independent of stage name; changing it reclassifies every task in the stage. Icons are escaped text, never executable markup or remote image URLs.

`STAGE_NOT_EMPTY`, `LAST_STAGE`, and `STAGE_LIMIT` conflicts explain the constraint, retain the draft, and reload authoritative metadata. Writes are serialized. A denied write revalidates access and disables retries until explicit refresh. Inaccessible reads clear the private list/draft; failed refresh hides stale controls and allows retry. Missing edited stages cannot be accidentally recreated. Route generation and account epoch/token checks ignore outdated reads/writes after navigation or session changes. There are no backend/schema/dependency changes.

## Project task board (#64)

The active `/projects/:projectId` route now renders ProjectBoard, replacing the summary placeholder while retaining project metadata and settings/workflow links. It reads the project, parent-space capabilities, ordered workflow stages, then `GET projects/{id}/work-items?groupBy=stage&page=N&size=25`. Board groups include every active stage but only tasks on the requested page. Column labels say “on this page”; the header's task count is the global `totalItems`. Explicit previous/next paging replaces cards, avoiding unsafe accumulation after concurrent reordering. Group metadata is authoritative for names/completion; changed stage identities between reads require refresh.

`ProjectBoardService` validates task/project/stage UUIDs, page totals, stage order, unique tasks and correspondence between page items and groups. Current task fields are id, projectId, title, stageId, stageName, complete and position; no fake assignees, type filters, sprint, epic, activity or detail destinations. Task creation/detail remains #65.

Both native drag-and-drop and the labelled keyboard move form send `POST work-items/{taskId}/move` with only `{stageId}`. Omitted position appends after removing the source item, including same-column moves. Visible page indexes are never global insertion positions. Writes require space.update (`canUpdate`) and are serialized. No optimistic card relocation occurs: ordinary failures retain cards/destination; denied writes revalidate and remain disabled until explicit refresh; inaccessible responses clear private data. Successful moves reload project metrics, permissions, stages and page zero, including both affected columns. All reads/writes ignore stale route/account responses. There is no persistent board cache: returning from workflow settings reloads current stage metadata.

Recoverable move conflicts (409) reload authoritative data without setting the permission-denied flag; a successful refresh permits immediate retry. Only 403 disables writes pending an explicit access refresh. The post-move success announcement and focus restoration require the full board reload to succeed, so a reload failure exposes only its error and retry path.

Desktop columns scroll inside the board; mobile columns stack without document overflow. Counts, pending status, success/failure, empty pages/boards and read-only states are explicit. The documented project header/columns and existing shell/tokens are reused; no exact Project Details Penpot URL was available for pixel comparison. Browser checks use API fixtures, not a deployed backend account.
