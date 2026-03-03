import * as vscode from 'vscode';

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
