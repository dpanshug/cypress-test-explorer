# Cypress Test Explorer for VS Code

A Visual Studio Code extension that helps you discover, navigate and run Cypress tests directly from the editor.

## Features

- 🔍 Automatically discovers all the cypress files in your workspace
- 📁 Displays tests in a tree view organized by directory structure
- ⚡ Quick access to run individual tests or all tests
- 🔄 Easy refresh to update the test list
- ⚙️ Configurable root folder for test discovery
- 🗂️ Configure project path for locating cypress config file
- 🔧 Configure cypress run variables tailored to each project

## Usage

### View Your Tests

1. Click the Cypress Test Explorer icon in the Activity Bar
2. Your Cypress tests will be automatically discovered and displayed in a tree view

### Run Tests

- Click the play button next to any test to run it
- When multiple tests are run simultaneously, they are executed in a queue
- Use the "Run All Tests" button in the title bar to run all tests

### Configure Root Folder

1. Click the folder icon in the Test Explorer title bar
2. Enter the relative path to your Cypress tests folder
3. The test tree will automatically refresh with tests from the specified folder

### Configure Project Folder

1. Click the folder icon (Set Cypress Project Path) in the Test Explorer title bar.
2. Enter the relative path to the folder containing the Cypress configuration file.

### Configure Cypress Run Variables

1. In the Activity Bar, below the list of Cypress files, locate the section for Cypress Run Variables.
2. Enter the variables such as `CY_MOCK=1`, to be used for executing the Cypress run.
3. Click Save to apply the changes.

### Configure executable command

Set the command to run Cypress tests.

1. Open the Command Palette by pressing Command + Shift + P (Mac) or Ctrl + Shift + P (Windows/Linux).
2. Type "Set Executable Cypress Command" and select it from the options.
3. Enter the command to run tests, e.g., npx cypress.

### Refresh Test List

Click the refresh button in the Test Explorer title bar to update the list of tests.

## Requirements

- Visual Studio Code v1.60.0 or higher
- Node.js and npm installed
- Cypress installed in your project

## Development

[VSC Extension quickstart](vsc-extension-quickstart.md) will provide a guide for developers getting started with creating and debugging VS Code extensions. If you're new to VS Code extension development, you can refer to this file for detailed instructions on:

- Setting up your development environment.
- Running the extension in a development instance of VS Code.
- Debugging and testing the extension.

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
