# Kheera-UI

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.14.

## Project Documentation

- [Engineering standards](docs/engineering/ENGINEERING_STANDARDS.md)
- [Implementation TODO](docs/planning/IMPLEMENTATION_TODO.md)
- [Frontend style guide](docs/design/STYLE_GUIDE.md)
- [Testing strategy](docs/testing/TESTING_STRATEGY.md)
- [Workspace navigation and API state](docs/architecture/WORKSPACE_NAVIGATION.md)

## Workspace navigation

The authenticated app includes a shared spaces sidebar and URL-based selection at
`/dashboard?space=<UUID>`. Spaces come from the current account's API; selection,
refresh, retry and sign-out respect session changes and access loss. Unsupported
dashboard data and actions are explicitly marked as coming soon. Space creation
and resource detail pages remain the separately tracked follow-up issues.

## Design Implementation Rules

When an issue references Penpot, the Penpot board is the visual source of truth.
Do not treat it as loose inspiration. Before coding a screen:

- Open the exact Penpot board or frame linked in the issue.
- Inspect the board text, layout, spacing, proportions, colors, and available
  assets.
- Check `public/` for existing product assets before creating placeholder
  icons, logos, illustrations, or CSS-drawn substitutes.
- Match the board's composition first, then adapt only as needed for responsive
  desktop and mobile behavior.
- Verify the implemented page in the browser against the Penpot board. A page
  that passes tests but looks visually different is not done.

Authentication pages must keep backend calls in services, not page components.
Components should own form state, validation display, loading/error UI, and
navigation only.

## Pull Request Readiness

Before creating a pull request, update every relevant README and document for
the change. This includes architecture, API/service contracts, design guidance,
implementation TODOs, and testing notes when the work changes them. A PR is not
ready if the code is current but the docs still describe the old behavior.

PR descriptions must link the implemented issue with a GitHub closing keyword,
for example `Closes #72`. Put the keyword in the PR body, not only in a commit
message or title. GitHub auto-closes linked issues when the PR is merged into
the repository default branch, so keep `develop` as the default branch when
issues should close on merge to `develop`.

## Network Sandbox Notes

Codex runs shell commands in a sandbox. Commands that need internet access, such
as `git push`, GitHub PR creation, package installs, or remote API checks, may
fail inside the default sandbox even when credentials and tokens are correct. Do
not retry those commands repeatedly in the default sandbox. Rerun the same
network command once with explicit network approval, using a narrow persistent
prefix such as `git push` when appropriate.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Testing and browser smoke

See [testing strategy](docs/testing/TESTING_STRATEGY.md). After npm ci and npx playwright install chromium, run npm run verify for unit tests, integration tests, production build and desktop/mobile browser smoke. Browser tests use an isolated API fixture; no real account is required.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

### Current-user profile

`/profile` displays the signed-in user's name and email from `GET /api/users/me`.
The account navigation shares the same identity. Refresh reloads both views;
loading and failures hide previously displayed details and provide a retry.
Profile details are read-only; profile editing and avatar uploads are not supported.
See the [issue #93 plan](docs/planning/issue-plans/issue-93_current-user-profile.md).

### Space Details and projects

Open a space from the sidebar to see its details and live paginated projects.
Project cards show API progress/open-task counts and open a read-only project overview.
Space editing, People management and the task board remain separate upcoming features.
See [Space Details architecture](docs/architecture/SPACE_DETAILS.md) and the
[issue #63 plan](docs/planning/issue-plans/issue-63_space-details.md).
