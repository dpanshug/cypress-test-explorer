import * as vscode from 'vscode';
import { TestExplorer } from './features/testExplorer';

export function activate(context: vscode.ExtensionContext) {
  console.log('Cypress Test Explorer is now active!');

  const testExplorer = new TestExplorer(context);
  context.subscriptions.push(testExplorer);
}

export function deactivate() {}
