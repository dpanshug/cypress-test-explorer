# Change Log

All notable changes to the "Cypress Test Explorer" extension will be documented in this file.

## [2.0.0] - 2026-03-20

### Added

- **Native VS Code Test Explorer integration** — tests now appear in VS Code's built-in Testing sidebar with standard play/debug buttons, filtering, and run profiles
- **"Cypress Test Explorer" section** in the Testing sidebar (similar to how Playwright appears)
- **Configuration panel** in the Testing sidebar with fields for Tests Directory, Cypress Project, Config File, Cypress Command, and Browser — with descriptions for each field
- **specPattern resolution** — automatically reads `specPattern` from your `cypress.config.{ts,js,mjs,cjs}` and uses it for test file discovery instead of hardcoded extensions (fixes #34)
- **tsx/jsx support** — discovers `.cy.tsx` and `.cy.jsx` test files (fixes #33)
- **"Open in Cypress"** run profile — opens tests in Cypress interactive mode via the Debug button in Test Explorer
- **Browser selection** — choose Chrome, Firefox, Edge, or Electron from the config panel or settings
- **Split environment variables** — separate OS-level env vars from Cypress `--env` vars with dedicated UI sections
- **Resolved patterns indicator** — when specPattern is read from your config, the panel shows which file extensions are being scanned

### Changed

- Minimum VS Code version raised from 1.60.0 to **1.73.0** (required for the Testing API)
- Activation triggers changed from `onView` to `workspaceContains` for faster, more reliable startup
- `cypressRunner.ts` simplified from a class with queuing to two pure functions (`buildCommand`, `getEnvironmentVariables`)
- Command titles now use `Cypress:` prefix for consistency (e.g., "Cypress: Set Root Folder")

### Removed

- Custom activity bar sidebar — replaced by native Test Explorer integration
- "Refresh Cypress Tests" command — replaced by built-in refresh in Test Explorer
- "Run Cypress Test" / "Run All Cypress Tests" inline buttons — replaced by native play buttons
- "Open in Cypress" inline button — replaced by Debug run profile
- Custom tree view context menus — no longer needed
- `models/testFile.ts`, `providers/testTreeDataProvider.ts`, `views/testExplorer.ts` — replaced by `controllers/testController.ts`

### Migration

- The deprecated `runVariables` setting is automatically migrated to `environmentVariables` on first activation
- All existing settings (`startingFolder`, `projectPath`, `configFilePath`, `cypressExecutable`) continue to work unchanged
- Settings can now be configured directly from the Testing sidebar panel instead of only via Command Palette or settings.json

## [1.0.3] - 2024-04-12

### Fixed

- Bug inside run all

## [1.0.2] - 2024-04-12

### Added

- Now it supports VSCode version from v1.60.0 and above.

## [1.0.1] - 2024-03-12

### Added

- Added custom logo for the extension

## [1.0.0] - 2024-03-12

### Added

- Initial release of Cypress Test Explorer
- Tree view for displaying Cypress test files
- Ability to run individual tests or all tests
- Environment variable management through a dedicated view
- Custom starting folder and project path configuration
- Support for both TypeScript (.cy.ts) and JavaScript (.cy.js) test files
- Refresh functionality to update the test tree
- Integration with VS Code's task system for running tests, allowing tests to be executed in a queue.
