import * as vscode from 'vscode';
import { TestExplorer } from './features/testExplorer';
import { EnvironmentVariablesView } from './features/environmentVariablesView';

export function activate(context: vscode.ExtensionContext) {
  console.log('Cypress Test Explorer is now active!');

  const testExplorer = new TestExplorer(context);
  context.subscriptions.push(testExplorer);

  const envVarsProvider = new EnvironmentVariablesView(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('cypressEnvironmentVariables', envVarsProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('cypressTestExplorer.updateEnvironmentVariables', () => {
      vscode.commands.executeCommand('cypressEnvironmentVariables.focus');
    }),
  );
}

export function deactivate() {
  console.log('Cypress Test Explorer is now deactivated!');
}
