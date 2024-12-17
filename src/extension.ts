import * as vscode from 'vscode';
import { TestExplorer } from './features/testExplorer';
import { RunVariablesView } from './features/runVariablesView';

export function activate(context: vscode.ExtensionContext) {
  console.log('Cypress Test Explorer is now active!');

  const testExplorer = new TestExplorer(context);
  context.subscriptions.push(testExplorer);

  const envVarsProvider = new RunVariablesView(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('cypressRunVariables', envVarsProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cypressTestExplorer.updateRunVariables', () => {
      vscode.commands.executeCommand('cypressRunVariables.focus');
    }),
  );
}

export function deactivate() {
  console.log('Cypress Test Explorer is now deactivated!');
}
