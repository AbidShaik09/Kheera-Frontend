# Kheera-UI

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.14.

## Project Documentation

- [Engineering standards](docs/engineering/ENGINEERING_STANDARDS.md)
- [Implementation TODO](docs/planning/IMPLEMENTATION_TODO.md)
- [Frontend style guide](docs/design/STYLE_GUIDE.md)

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

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
