# Task Details and editing (#65 core slice)

The project board links task titles to `/work-items/:workItemId` and exposes `/projects/:projectId/tasks/new` for users with parent-space `canUpdate`. Child creation uses a `parent` UUID query parameter, validated by an authorized same-project detail read. Task transport always uses work-item UUIDs, with no fabricated issue number or sprint relationship.

## Contract and ownership

TaskService owns HTTP, response validation, session guards and typed detail/type/filtered-page contracts. TaskDetails owns form, route lifetime and local relation choices. Existing project, space, workflow and membership services provide context and capability reads.

| Operation | Endpoint | Semantics |
|---|---|---|
| Detail | GET work-items/{id} | TaskDetail including project/space, stage/type, effort, hierarchy, historical assignment and dates |
| Create | POST projects/{id}/work-items | Title required; active project type/stage choices; effort defaults to 1 |
| Update | PATCH work-items/{id} | Changed fields only; null clears description, parent, assignment and dates |
| Delete | DELETE work-items/{id} | Requires 204; TASK_HAS_CHILDREN 409 retains the editor and confirmation |
| Types | GET projects/{id}/work-item-types | Active project types, including default Task provisioned by backend |
| Parent/children | GET projects/{id}/work-items | Bounded 25-item pages; literal q search or parentId filter; explicit paging |
| Assignees | GET spaces/{id}/members | Active scoped members with explicit search/paging; writes use membership ID, never user ID |

All writes, including task deletion, require space.update (`canUpdate`), not the space deletion permission. Parent/type/stage choices are project-scoped; member choices are space-scoped. Server validation remains authoritative for descendant cycles and access races. Historical inactive assignments remain visible and can be retained or cleared, but cannot be selected as new active assignments. A historical missing type can remain unchanged when editing another field.

Dates are labelled UTC and edited with datetime-local inputs. New/edited dates are sent as ISO instants. Comparing against the original rendered draft omits unchanged dates, preserving backend sub-millisecond precision. Effort accepts integers 0 through 2147483647. Title/description limits count Unicode code points (255/500).

## State and accessibility

No optimistic mutations or persistent task cache. Ordinary 400/409/network/server failures preserve the draft and explain errors; duplicate writes are disabled while pending. Forbidden/missing task mutations clear private task/project/space/draft and offer a fresh read. Current 401 expires the session; stale route/account responses are ignored before side effects. Search and related pages have independent progress/error states. Read-only users can view task context and children.

Deletion is an inline confirmation group: Cancel receives focus; Escape cancels and restores focus to Delete task. Fields have labels and validation associations. Desktop uses a two-column metadata/date grid within the existing editor panel; mobile stacks it. Existing semantic tokens provide both themes.

Back to project and post-delete navigation instantiate a fresh board read, including project metrics. Dashboard task data/history remains #92; it has no live task cache to invalidate. Comments #90, attachments #91 and backend #70 visit tracking remain explicit unavailable states, with no fabricated writes. Overall #65 remains open for these dependent collaboration slices.

No exact Task Details Penpot URL was supplied in issue/repositories; the documented task editor/status/destructive-accent composition is used. Fixture browser tests are frontend evidence only; separate disposable backend smoke is recorded in the issue plan.
Legacy nullable effort is displayed unset and omitted on unrelated PATCHes. Setting an effort still requires a nonnegative integer; an existing numeric effort cannot be cleared to null.
