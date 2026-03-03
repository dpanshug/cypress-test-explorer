import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TestFile } from '../models/testFile';
import { TEST_FILE_EXTENSIONS } from '../constants';
import * as configService from '../services/configService';

export class TestTreeDataProvider implements vscode.TreeDataProvider<TestFile>, vscode.Disposable {
  private _onDidChangeTreeData = new vscode.EventEmitter<TestFile | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private fileWatcher: vscode.FileSystemWatcher | undefined;

  constructor(private workspaceRoot: string) {
    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    if (!this.workspaceRoot) {
      return;
    }

    const pattern = new vscode.RelativePattern(
      this.workspaceRoot,
      '**/*.cy.{ts,js,tsx,jsx}',
    );

    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.fileWatcher.onDidCreate(() => this.refresh());
    this.fileWatcher.onDidDelete(() => this.refresh());
    this.fileWatcher.onDidChange(() => this.refresh());
  }

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

    const startingFolder = configService.getStartingFolder();
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
    try {
      await fs.promises.access(dir);
    } catch {
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
        } else if (this.isTestFile(entry.name)) {
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

  private isTestFile(filename: string): boolean {
    return TEST_FILE_EXTENSIONS.some((ext) => filename.endsWith(ext));
  }

  dispose(): void {
    this.fileWatcher?.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
