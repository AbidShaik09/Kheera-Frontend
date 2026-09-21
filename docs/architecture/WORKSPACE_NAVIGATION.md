# Workspace navigation (#85)

## Routes and ownership

The public landing page remains at /. Login, registration and password recovery remain public guest routes. A guarded WorkspaceShell wraps /dashboard, /profile and /settings, with a child guard on every transition.

The first workspace slice uses /dashboard?space=<UUID>. Selection survives reload, direct links and browser Back, is validated against GET /api/spaces, and is not stored as a cross-account preference. The sidebar and breadcrumb show only API-authorized names. Selecting another space revalidates the list and discards any older in-flight response. A no-longer-visible selected UUID shows an unavailable message and a return link.

Resource routes /spaces/:spaceId, /projects/:projectId and /work-items/:workItemId are owned by #63/#64/#65 and are not advertised until those pages exist. Those issues should reuse the shell and build their own authorized resource loading. #86 owns space creation; until it lands, Create space is explicitly disabled with explanatory text.

## HTTP and state contract

WorkspaceService owns GET spaces through ApiService, with the existing /api/ runtime prefix. The response is an array of {id,name}, not a page envelope. Runtime validation rejects malformed shapes, non-UUID identifiers and duplicate IDs. There are no invented project counts, IDs or client-side authorization grants.

The service exposes idle/loading/ready/error states. Refresh clears old data while revalidating. Empty arrays are real onboarding states; 403/404 discard the prior list and explain unavailable access; 401 logs out; other failures offer retry. No backend mutations were introduced.

Each request captures a monotonically increasing request number, AuthService session epoch and token. Only the latest request for the same live session may publish. A computed state gate immediately hides prior-session data on logout or account change, even before an old response settles. Session restoration similarly ignores results belonging to an older login.

Token storage events from other tabs invalidate visible login/workspace state without deleting the replacement shared token. This tab returns to login; a reload validates the shared token through users/me. DestroyRef removes the storage listener when the service is destroyed.

## UI and unsupported features

The inspected Penpot dashboard retains top navigation, the Activity/Favourites/Spaces rail, three central history sections and a right focus panel. Theme tokens supply light/dark styling. Small screens use Show/Hide spaces, Escape restores toggle focus, and navigation closes the expanded sidebar and moves focus to content. A skip link and labeled controls support keyboard navigation.

Fake task cards, fake focus text, favourites, activity and project counts were removed. Unsupported data uses coming-soon copy, not a false user-specific empty result. Search/Create/notifications are disabled until their feature/API slices exist; profile/settings/theme and Sign out remain real controls. #92 supplies actual dashboard aggregates later.

## Verification

Workspace service tests cover shape validation, empty/failure/retry states, out-of-order requests, session expiry and cross-account responses. Router/HTTP integration uses real services, routes and bearer interception, with only HTTP responses supplied as fixtures. Browser smoke covers desktop/mobile, light/dark, URL restoration, keyboard selection, Back/reload, retry, access revocation, sign-out and cross-tab token replacement.

These tests exercise the frontend against the documented array contract. They do not prove deployment or live backend authorization. The backend API and persistence were unchanged.
