import * as vscode from 'vscode';
import { CypressTestController } from './controllers/testController';
import { RunVariablesViewProvider } from './providers/runVariablesViewProvider';
import { COMMANDS, VIEW_IDS } from './constants';
import { log, disposeLogger } from './services/logger';
import * as configService from './services/configService';

export function activate(context: vscode.ExtensionContext): void {
  log('Cypress Test Explorer activated');

  migrateRunVariables(context);

  const runVariablesProvider = new RunVariablesViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(VIEW_IDS.RUN_VARIABLES, runVariablesProvider),
  );

  const testController = new CypressTestController(context);
  context.subscriptions.push(testController);

  testController.onPatternsResolved = (extensions, source) => {
    runVariablesProvider.updateResolvedPatterns(extensions, source);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMANDS.UPDATE_RUN_VARIABLES, () => {
      vscode.commands.executeCommand(`${VIEW_IDS.RUN_VARIABLES}.focus`);
    }),
  );
}

const MIGRATION_KEY = 'runVariablesMigrated';

async function migrateRunVariables(context: vscode.ExtensionContext): Promise<void> {
  if (context.globalState.get<boolean>(MIGRATION_KEY)) {
    return;
  }

  const oldVars = configService.getRunVariables();
  if (Object.keys(oldVars).length > 0) {
    const existingEnvVars = configService.getEnvironmentVariables();
    if (Object.keys(existingEnvVars).length === 0) {
      await configService.updateEnvironmentVariables(oldVars);
      log(`Migrated runVariables to environmentVariables: ${JSON.stringify(oldVars)}`);
    }
    await configService.clearRunVariables();
    log('Cleared deprecated runVariables config');
  }

  await context.globalState.update(MIGRATION_KEY, true);
}

export function deactivate(): void {
  log('Cypress Test Explorer deactivated');
  disposeLogger();
}
