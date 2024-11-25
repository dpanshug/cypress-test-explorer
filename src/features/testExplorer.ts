import * as vscode from 'vscode';
import { TestTreeDataProvider } from './testTreeDataProvider';

export class TestExplorer {
  private treeDataProvider: TestTreeDataProvider | undefined;
  private treeView: vscode.TreeView<vscode.TreeItem> | undefined;

  constructor(context: vscode.ExtensionContext) {
    const workspaceRoot =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : '';

    if (!workspaceRoot) {
      vscode.window.showErrorMessage(
        'No workspace folder open. Please open a folder to use Cypress Test Explorer.',
      );
      return;
    }

    this.treeDataProvider = new TestTreeDataProvider(workspaceRoot);
    this.treeView = vscode.window.createTreeView('cypressTestExplorer', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
    });

    const refreshCommand = vscode.commands.registerCommand('cypressTestExplorer.refresh', () => {
      this.refresh();
    });

    context.subscriptions.push(refreshCommand);
    context.subscriptions.push(this);

    this.refresh();
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
        this.treeDataProvider?.refresh();
        await new Promise((resolve) => setTimeout(resolve, 500));
        progress.report({ increment: 100 });
      },
    );
    vscode.window.showInformationMessage('Cypress Test Explorer refreshed!');
  }

  dispose() {
    this.treeView?.dispose();
  }
}
