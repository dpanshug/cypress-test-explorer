import * as vscode from 'vscode';
import { TestExplorer } from './views/testExplorer';
import { RunVariablesViewProvider } from './providers/runVariablesViewProvider';
import { COMMANDS, VIEW_IDS } from './constants';
import { log, disposeLogger } from './services/logger';

export function activate(context: vscode.ExtensionContext): void {
  log('Cypress Test Explorer activated');

  const testExplorer = new TestExplorer(context);
  context.subscriptions.push(testExplorer);

  const runVariablesProvider = new RunVariablesViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_IDS.RUN_VARIABLES, runVariablesProvider),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.UPDATE_RUN_VARIABLES, () => {
      vscode.commands.executeCommand(`${VIEW_IDS.RUN_VARIABLES}.focus`);
    }),
  );
}

export function deactivate(): void {
  log('Cypress Test Explorer deactivated');
  disposeLogger();
}
