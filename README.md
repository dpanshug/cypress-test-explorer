# Cypress Test Explorer for VS Code

A Visual Studio Code extension that helps you discover, navigate and run Cypress tests directly from the editor.

## Features

- 🔍 Automatically discovers all `.cy.ts` files in your workspace
- 📁 Displays tests in a tree view organized by directory structure
- ⚡ Quick access to run individual tests or all tests
- 🔄 Easy refresh to update the test list
- ⚙️ Configurable root folder for test discovery

## Usage

### View Your Tests

1. Click the Cypress Test Explorer icon in the Activity Bar
2. Your Cypress tests will be automatically discovered and displayed in a tree view

### Configure Root Folder

1. Click the folder icon in the Test Explorer title bar
2. Enter the relative path to your Cypress tests folder
3. The test tree will automatically refresh with tests from the specified folder

### Run Tests

- Click the play button next to any test to run it
- Use the "Run All Tests" button in the title bar to run all tests
- Tests can also be run from the context menu

### Refresh Test List

Click the refresh button in the Test Explorer title bar to update the list of tests.

## Requirements

- Visual Studio Code v1.60.0 or higher
- Node.js and npm installed
- Cypress installed in your project

## Extension Settings

This extension contributes the following settings:

- `cypressTestExplorer.startingFolder`: Specify the starting folder for Cypress tests (relative to workspace root)
- `cypressTestExplorer.cypressExecutable`: Specify the Cypress executable command (default: "npx cypress")

## Development

[VSC Extension quickstart](vsc-extension-quickstart.md) will provide a guide for developers getting started with creating and debugging VS Code extensions. If you're new to VS Code extension development, you can refer to this file for detailed instructions on:

- Setting up your development environment.
- Running the extension in a development instance of VS Code.
- Debugging and testing the extension.

## Known Issues

Please report issues on the [GitHub repository](https://github.com/yourusername/cypress-test-explorer/issues).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
