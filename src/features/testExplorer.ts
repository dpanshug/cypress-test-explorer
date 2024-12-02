import * as vscode from 'vscode';
import * as path from 'path';
import { TestTreeDataProvider, TestFile } from './testTreeDataProvider';

export class TestExplorer {
  private treeDataProvider: TestTreeDataProvider;
  private treeView: vscode.TreeView<vscode.TreeItem>;
  private testQueue: { command: string; testName: string }[] = [];
  private isRunning: boolean = false;
  private currentTest: string | null = null;

  constructor(private context: vscode.ExtensionContext) {
    const workspaceRoot =
      vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
        ? vscode.workspace.workspaceFolders[0].uri.fsPath
        : '';

    this.treeDataProvider = new TestTreeDataProvider(workspaceRoot);
    this.treeView = vscode.window.createTreeView('cypressTestExplorer', {
      treeDataProvider: this.treeDataProvider,
      showCollapseAll: true,
    });

    this.registerCommands();
    this.setUpConfigurationListener();

    this.refresh();
  }

  private registerCommands() {
    this.context.subscriptions.push(
      vscode.commands.registerCommand('cypressTestExplorer.refresh', () => this.refresh()),
      vscode.commands.registerCommand('cypressTestExplorer.setStartingFolder', () =>
        this.setStartingFolder(),
      ),
      vscode.commands.registerCommand('cypressTestExplorer.setProjectPath', () =>
        this.setProjectPath(),
      ),
      vscode.commands.registerCommand('cypressTestExplorer.setEnvironmentVariables', () =>
        this.setEnvironmentVariables(),
      ),
      vscode.commands.registerCommand('cypressTestExplorer.runTest', (test) => this.runTest(test)),
      vscode.commands.registerCommand('cypressTestExplorer.runAllTests', () => this.runAllTests()),
      vscode.commands.registerCommand('cypressTestExplorer.setCypressExecutable', () =>
        this.setCypressExecutable(),
      ),
    );
  }

  private setUpConfigurationListener() {
    this.context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('cypressTestExplorer.startingFolder') ||
          e.affectsConfiguration('cypressTestExplorer.projectPath')
        ) {
          this.refresh();
        }
      }),
    );
  }

  public async setStartingFolder() {
    const currentPath = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('startingFolder', '');
    const newPath = await vscode.window.showInputBox({
      prompt:
        'Enter the folder location where all your cypress tests are located (relative to workspace root)',
      placeHolder: 'e.g., frontend/src/__tests__/cypress',
      value: currentPath,
      validateInput: (value) => {
        if (!value || (value && !path.isAbsolute(value))) {
          return null; // input is valid
        }
        return 'Please enter a relative path';
      },
    });

    if (newPath !== undefined) {
      await vscode.workspace
        .getConfiguration('cypressTestExplorer')
        .update('startingFolder', newPath, true);
      vscode.window.showInformationMessage(`Cypress starting folder set to: ${newPath}`);
      this.refresh();
    }
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
        await this.treeDataProvider.refresh();
        await new Promise((resolve) => setTimeout(resolve, 500));
        progress.report({ increment: 100 });
      },
    );

    const hasItems = await this.treeDataProvider.getChildren();
    this.treeView.message =
      hasItems.length === 0
        ? 'No Cypress tests found. Create a .cy.ts or .cy.js file or click refresh.'
        : undefined;

    vscode.window.showInformationMessage('Cypress Test Explorer refreshed!');
  }

  public async setProjectPath() {
    const currentPath = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('projectPath', '');
    const newPath = await vscode.window.showInputBox({
      prompt:
        'Enter the path to your Cypress project directory where config file is located (relative to workspace root)',
      placeHolder: 'e.g., frontend/src/__tests__/cypress',
      value: currentPath,
      validateInput: (value) => {
        if (!value || (value && !path.isAbsolute(value))) {
          return null; // input is valid
        }
        return 'Please enter a relative path';
      },
    });

    if (newPath !== undefined) {
      await vscode.workspace
        .getConfiguration('cypressTestExplorer')
        .update('projectPath', newPath, true);
      vscode.window.showInformationMessage(`Cypress project path set to: ${newPath}`);
      this.refresh();
    }
  }

  public async setEnvironmentVariables() {
    const currentEnv = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('environmentVariables', {});
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
          if (key && value) acc[key.trim()] = value.trim();
          return acc;
        },
        {} as Record<string, string>,
      );

      await vscode.workspace
        .getConfiguration('cypressTestExplorer')
        .update('environmentVariables', newEnv, true);
      vscode.window.showInformationMessage(`Environment variables updated`);
      this.refresh();
    }
  }

  private getCypressCommand(spec?: string): string {
    const config = vscode.workspace.getConfiguration('cypressTestExplorer');
    const cypressExecutable = config.get('cypressExecutable', 'npx cypress');
    const projectPath = config.get('projectPath', '');
    const envVars = config.get('environmentVariables', {});

    const projectOption = projectPath ? `--project "${projectPath}"` : '';
    const specOption = spec ? `--spec "${spec}"` : '';
    const envString = Object.entries(envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');

    return `${envString} ${cypressExecutable} run ${projectOption} ${specOption}`.trim();
  }

  public async setCypressExecutable() {
    const currentCommand = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('cypressExecutable', '');

    const executableCommand = await vscode.window.showInputBox({
      prompt:
        'Specify the Cypress executable command (e.g., "npx cypress" or path to Cypress binary)',
      placeHolder: 'npx cypress',
      value: currentCommand,
      validateInput: (value) => {
        if (!value || (value && !path.isAbsolute(value))) {
          return null; // input is valid
        }
        return 'Please enter a relative path';
      },
    });

    if (executableCommand !== undefined) {
      await vscode.workspace
        .getConfiguration('cypressTestExplorer')
        .update('cypressExecutable', executableCommand, true);
      vscode.window.showInformationMessage(
        `Cypress executable command set to: ${executableCommand}`,
      );
      this.refresh();
    }
  }

  private async runTest(test: TestFile) {
    const testPath = vscode.workspace.asRelativePath(test.resourceUri.fsPath);
    const command = this.getCypressCommand(testPath);
    const testName = path.basename(testPath);

    this.testQueue.push({ command, testName });
    vscode.window.showInformationMessage(`Test queued: ${testName}`);

    if (!this.isRunning) {
      this.runNextTest();
    }
  }

  private async runAllTests() {
    const startingFolder = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('startingFolder', '');
    const specPattern = startingFolder ? `"${startingFolder}/**/*.cy.{js,ts}"` : '';
    const command = this.getCypressCommand(specPattern);

    this.testQueue.push({ command, testName: 'All Tests' });
    vscode.window.showInformationMessage('All tests queued');

    if (!this.isRunning) {
      this.runNextTest();
    }
  }

  private async runNextTest() {
    if (this.testQueue.length === 0) {
      this.isRunning = false;
      this.currentTest = null;
      return;
    }

    this.isRunning = true;
    const { command, testName } = this.testQueue.shift()!;
    this.currentTest = testName;

    vscode.window.showInformationMessage(`Running test: ${this.currentTest}`);

    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      `Run Test: ${testName}`,
      'Test Runner',
      new vscode.ShellExecution(command),
    );

    const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.name === `Run Test: ${testName}`) {
        if (e.exitCode === 0) {
          vscode.window.showInformationMessage('All specs passed!');
        } else {
          vscode.window.showInformationMessage('All specs failed.');
        }

        disposable.dispose();
        this.runNextTest();
      }
    });

    vscode.tasks.executeTask(task);
  }

  dispose() {
    this.treeView.dispose();
  }
}
