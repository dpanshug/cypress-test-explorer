import * as vscode from 'vscode';
import * as path from 'path';
import { TestTreeDataProvider } from '../providers/testTreeDataProvider';
import { CypressRunner } from '../services/cypressRunner';
import * as configService from '../services/configService';
import { COMMANDS, VIEW_IDS, CONFIG } from '../constants';
import { log } from '../services/logger';

export class TestExplorer implements vscode.Disposable {
  private treeDataProvider: TestTreeDataProvider;
  private treeView: vscode.TreeView<vscode.TreeItem>;
  private cypressRunner: CypressRunner;
  private disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext) {
    const workspaceRoot =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : '';

    this.treeDataProvider = new TestTreeDataProvider(workspaceRoot);
    this.treeView = vscode.window.createTreeView(VIEW_IDS.TEST_EXPLORER, {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
    });
    this.cypressRunner = new CypressRunner();

    this.registerCommands(context);
    this.setupConfigurationListener();
    this.refresh();
  }

  private registerCommands(context: vscode.ExtensionContext): void {
    const commands: [string, (...args: never[]) => unknown][] = [
      [COMMANDS.REFRESH, () => this.refresh()],
      [COMMANDS.SET_STARTING_FOLDER, () => this.setStartingFolder()],
      [COMMANDS.SET_PROJECT_PATH, () => this.setProjectPath()],
      [COMMANDS.SET_RUN_VARIABLES, () => this.setRunVariables()],
      [COMMANDS.RUN_TEST, (test) => this.cypressRunner.queueTest(test)],
      [COMMANDS.OPEN_TEST, (test) => this.cypressRunner.openTest(test)],
      [COMMANDS.RUN_ALL_TESTS, () => this.cypressRunner.queueAllTests()],
      [COMMANDS.SET_CYPRESS_EXECUTABLE, () => this.setCypressExecutable()],
    ];

    for (const [id, handler] of commands) {
      context.subscriptions.push(vscode.commands.registerCommand(id, handler));
    }
  }

  private setupConfigurationListener(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration(`${CONFIG.SECTION}.${CONFIG.STARTING_FOLDER}`) ||
        e.affectsConfiguration(`${CONFIG.SECTION}.${CONFIG.PROJECT_PATH}`)
      ) {
        this.refresh();
      }
    });
    this.disposables.push(disposable);
  }

  private async setStartingFolder(): Promise<void> {
    const currentPath = configService.getStartingFolder();
    const newPath = await this.promptForRelativePath(
      'Enter the folder location where all your cypress tests are located (relative to workspace root)',
      'e.g., frontend/src/__tests__/cypress',
      currentPath,
    );

    if (newPath !== undefined) {
      await configService.updateStartingFolder(newPath);
      vscode.window.showInformationMessage(`Cypress starting folder set to: ${newPath}`);
      log(`Starting folder set to: ${newPath}`);
      this.refresh();
    }
  }

  private async setProjectPath(): Promise<void> {
    const currentPath = configService.getProjectPath();
    const newPath = await this.promptForRelativePath(
      'Enter the path to your Cypress project directory where config file is located (relative to workspace root)',
      'e.g., frontend/src/__tests__/cypress',
      currentPath,
    );

    if (newPath !== undefined) {
      await configService.updateProjectPath(newPath);
      vscode.window.showInformationMessage(`Cypress project path set to: ${newPath}`);
      log(`Project path set to: ${newPath}`);
      this.refresh();
    }
  }

  private async setCypressExecutable(): Promise<void> {
    const currentCommand = configService.getCypressExecutable();

    const executableCommand = await vscode.window.showInputBox({
      prompt:
        'Specify the Cypress executable command (e.g., "npx cypress" or path to Cypress binary)',
      placeHolder: 'npx cypress',
      value: currentCommand,
      validateInput: (value) => {
        if (!value || (value && !path.isAbsolute(value))) {
          return null;
        }
        return 'Please enter a relative path';
      },
    });

    if (executableCommand !== undefined) {
      await configService.updateCypressExecutable(executableCommand);
      vscode.window.showInformationMessage(
        `Cypress executable command set to: ${executableCommand}`,
      );
      log(`Cypress executable set to: ${executableCommand}`);
      this.refresh();
    }
  }

  private async setRunVariables(): Promise<void> {
    const currentEnv = configService.getEnvironmentVariables();
    const envString = await vscode.window.showInputBox({
      prompt: 'Enter environment variables as KEY1=VALUE1,KEY2=VALUE2',
      value: Object.entries(currentEnv)
        .map(([k, v]) => `${k}=${v}`)
        .join(','),
    });

    if (envString !== undefined) {
      const newEnv = envString.split(',').reduce(
        (acc, pair) => {
          const [key, value] = pair.split('=');
          if (key && value) {
            acc[key.trim()] = value.trim();
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      await configService.updateEnvironmentVariables(newEnv);
      vscode.window.showInformationMessage('Environment variables updated');
      log(`Environment variables updated via input box: ${JSON.stringify(newEnv)}`);
      this.refreshRunVariablesView();
      this.refresh();
    }
  }

  private refreshRunVariablesView(): void {
    vscode.commands.executeCommand(COMMANDS.UPDATE_RUN_VARIABLES);
  }

  public async refresh(): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Refreshing Cypress Tests',
        cancellable: false,
      },
      async () => {
        await this.treeDataProvider.refresh();
      },
    );

    const hasItems = await this.treeDataProvider.getChildren();
    this.treeView.message =
      hasItems.length === 0
        ? 'No Cypress tests found. Create a .cy.ts or .cy.js file or click refresh.'
        : undefined;
  }

  private async promptForRelativePath(
    prompt: string,
    placeHolder: string,
    currentValue: string,
  ): Promise<string | undefined> {
    return vscode.window.showInputBox({
      prompt,
      placeHolder,
      value: currentValue,
      validateInput: (value) => {
        if (!value || !path.isAbsolute(value)) {
          return null;
        }
        return 'Please enter a relative path';
      },
    });
  }

  dispose(): void {
    this.treeView.dispose();
    this.treeDataProvider.dispose();
    this.cypressRunner.dispose();
    this.disposables.forEach((d) => d.dispose());
  }
}
