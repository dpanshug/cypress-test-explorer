import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class TestFile extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly resourceUri: vscode.Uri,
  ) {
    super(label, collapsibleState);
    this.tooltip = this.resourceUri.fsPath;

    if (this.collapsibleState === vscode.TreeItemCollapsibleState.None) {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [this.resourceUri],
      };
      this.contextValue = 'cypressTest';
    }
  }
}

export class TestTreeDataProvider implements vscode.TreeDataProvider<TestFile> {
  private _onDidChangeTreeData: vscode.EventEmitter<TestFile | undefined | null | void> =
    new vscode.EventEmitter<TestFile | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<TestFile | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private workspaceRoot: string) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TestFile): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TestFile): Thenable<TestFile[]> {
    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage('No Cypress tests in empty workspace');
      return Promise.resolve([]);
    }

    const startingFolder = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('startingFolder', '');
    const rootDir = startingFolder
      ? path.join(this.workspaceRoot, startingFolder)
      : this.workspaceRoot;

    if (element) {
      return this.getTestFiles(element.resourceUri.fsPath);
    } else {
      return this.getTestFiles(rootDir);
    }
  }

  private async getTestFiles(dir: string): Promise<TestFile[]> {
    if (!fs.existsSync(dir)) {
      return [];
    }

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const filePath = path.join(dir, entry.name);
        const uri = vscode.Uri.file(filePath);

        if (entry.isDirectory()) {
          const children = await this.getTestFiles(filePath);
          if (children.length > 0) {
            return new TestFile(entry.name, vscode.TreeItemCollapsibleState.Collapsed, uri);
          }
          return null;
        } else if (entry.name.endsWith('.cy.ts') || entry.name.endsWith('.cy.js')) {
          return new TestFile(entry.name, vscode.TreeItemCollapsibleState.None, uri);
        }
        return null;
      }),
    );

    const validItems = items.filter((item): item is TestFile => item !== null);

    return validItems.sort((a, b) => {
      if (a.collapsibleState === b.collapsibleState) {
        return a.label.localeCompare(b.label);
      }
      return b.collapsibleState - a.collapsibleState;
    });
  }
}
