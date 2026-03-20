# Cypress Test Explorer for VS Code

A Visual Studio Code extension that integrates Cypress tests into the native Test Explorer, giving you a familiar, first-class testing experience.

## Features

- Integrates with VS Code's built-in **Testing sidebar** — no custom panels to learn
- Automatically discovers `.cy.{ts,js,tsx,jsx}` files across your workspace
- Reads `specPattern` from your `cypress.config` for projects with custom naming conventions
- **Run** tests headlessly or **Open in Cypress** interactively, directly from Test Explorer
- Configure browser, paths, and environment variables from a settings panel in the Testing sidebar
- Separate management of OS-level env vars and Cypress `--env` vars

## Getting Started

1. Install the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=dpanshug.cypress-test-explorer)
2. Open a project that contains Cypress test files (`.cy.ts`, `.cy.js`, `.cy.tsx`, or `.cy.jsx`)
3. Open the **Testing sidebar** (beaker icon in the Activity Bar, or `Ctrl+Shift+T` / `Cmd+Shift+T`)
4. Your tests appear automatically in the Test Explorer tree

## Usage

### Running Tests

- Click the **play button** next to any test file to run it headlessly (`cypress run`)
- Click the **debug button** to open it in Cypress interactive mode (`cypress open`)
- Use **Run All** at the top of the Test Explorer to run everything

### Configuration Panel

Expand the **Cypress Test Explorer** section in the Testing sidebar to access all settings:

| Field | Purpose |
|---|---|
| **Tests Directory** | Folder to scan for test files (relative to workspace root) |
| **Cypress Project** | Directory containing your `cypress.config` file (passed as `--project`) |
| **Config File** | Only needed if the config file has a non-standard name or location |
| **Cypress Command** | Command to invoke Cypress (default: `npx cypress`) |
| **Browser** | Choose Chrome, Firefox, Edge, Electron, or let Cypress decide |

All fields are optional — the extension works out of the box for standard project structures.

Below the configuration section, you can manage:

- **Environment Variables** — OS-level variables passed to the Cypress process (e.g., `CY_MOCK=1`)
- **Cypress Env** — Variables passed via `--env` flag, accessed with `Cypress.env()` in your tests

### Automatic specPattern Detection

If your project uses a custom `specPattern` in `cypress.config.ts` (e.g., `**/*.spec.ts` instead of `**/*.cy.ts`), the extension reads it automatically and adjusts file discovery. When this happens, the config panel shows which patterns are active.

### Command Palette

All settings are also accessible via the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

- `Cypress: Set Root Folder`
- `Cypress: Set Project Path`
- `Cypress: Set Executable Command`
- `Cypress: Update Run Variables`

## Monorepo / Non-Standard Setups

For projects where Cypress lives in a subdirectory (e.g., `packages/cypress`), configure:

1. **Tests Directory** — where your `.cy.ts` files are (e.g., `packages/cypress/cypress/tests`)
2. **Cypress Project** — where `cypress.config.ts` lives (e.g., `packages/cypress`)

## Requirements

- Visual Studio Code v1.73.0 or higher
- Node.js and npm installed
- Cypress installed in your project

## Development

See [VSC Extension quickstart](vsc-extension-quickstart.md) for setting up a development environment, running the extension in debug mode, and testing.

## Known Issues

Please report issues on the [GitHub repository](https://github.com/dpanshug/cypress-test-explorer/issues).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
