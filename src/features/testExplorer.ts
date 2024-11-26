import * as vscode from 'vscode';
import * as path from 'path';
import { TestTreeDataProvider } from './testTreeDataProvider';

export class TestExplorer {
  private treeDataProvider: TestTreeDataProvider;
  private treeView: vscode.TreeView<vscode.TreeItem>;

  constructor(private context: vscode.ExtensionContext) {
    const workspaceRoot =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : '';

    this.treeDataProvider = new TestTreeDataProvider(workspaceRoot);
    this.treeView = vscode.window.createTreeView('cypressTestExplorer', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
    });

    this.registerCommands();
    this.setUpConfigurationListener();

    this.refresh();
  }

  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('cypressTestExplorer.refresh', () => this.refresh()),
      vscode.commands.registerCommand('cypressTestExplorer.setStartingFolder', () =>
        this.setStartingFolder(),
      ),
      vscode.commands.registerCommand('cypressTestExplorer.runTest', (test) => this.runTest(test)),
      vscode.commands.registerCommand('cypressTestExplorer.runAllTests', () => this.runAllTests()),
    );
  }

  private setUpConfigurationListener() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('cypressTestExplorer.startingFolder')) {
          this.refresh();
        }
      }),
    );
  }

  public async setStartingFolder() {
    const currentPath = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('startingFolder', '');
    const newPath = await vscode.window.showInputBox({
      prompt: 'Enter the starting folder for Cypress tests (relative to workspace root)',
      value: currentPath,
      validateInput: (value) => {
        if (!value || (value && !path.isAbsolute(value))) {
          return null; // input is valid
        }
        return 'Please enter a relative path';
      },
    });

    if (newPath !== undefined) {
      await vscode.workspace
        .getConfiguration('cypressTestExplorer')
        .update('startingFolder', newPath, true);
      vscode.window.showInformationMessage(`Cypress starting folder set to: ${newPath}`);
      this.refresh();
    }
  }

  public async refresh(): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Refreshing Cypress Tests',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0 });
        await new Promise((resolve) => setTimeout(resolve, 500));
        progress.report({ increment: 50 });
        this.treeDataProvider.refresh();
        await new Promise((resolve) => setTimeout(resolve, 500));
        progress.report({ increment: 100 });
      },
    );

    const hasItems = await this.treeDataProvider.getChildren();
    this.treeView.message =
      hasItems.length === 0
        ? 'No Cypress tests found. Create a .cy.ts file or click refresh.'
        : undefined;

    vscode.window.showInformationMessage('Cypress Test Explorer refreshed!');
  }

  private async runTest(test: vscode.TreeItem) {
    // TODO: Implement test running logic here
    vscode.window.showInformationMessage(`Running test: ${test.label}`);
  }

  private async runAllTests() {
    // TODO: Implement logic to run all tests
    vscode.window.showInformationMessage('Running all Cypress tests');
  }

  dispose() {
    this.treeView.dispose();
  }
}
