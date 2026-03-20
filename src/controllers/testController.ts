import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { buildCommand, getEnvironmentVariables } from '../services/cypressRunner';
import * as configService from '../services/configService';
import { COMMANDS, CONFIG, TEST_FILE_EXTENSIONS } from '../constants';
import { log } from '../services/logger';
import { resolveTestFileExtensions } from '../services/configParser';

export class CypressTestController implements vscode.Disposable {
  private controller: vscode.TestController;
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private disposables: vscode.Disposable[] = [];
  private testFileExtensions: readonly string[] = TEST_FILE_EXTENSIONS;
  private _onPatternsResolved?: (extensions: string[] | null, source: string | null) => void;

  constructor(private context: vscode.ExtensionContext) {
    this.controller = vscode.tests.createTestController('cypressTestExplorer', 'Cypress');
    context.subscriptions.push(this.controller);

    this.controller.refreshHandler = () => this.discoverTests();

    this.controller.createRunProfile(
      'Run',
      vscode.TestRunProfileKind.Run,
      (request, token) => this.runHandler(request, token),
      true,
    );

    this.controller.createRunProfile(
      'Open in Cypress',
      vscode.TestRunProfileKind.Debug,
      (request, token) => this.openHandler(request, token),
    );

    this.registerCommands();
    this.setupConfigurationListener();
    this.setupFileWatcher();
    this.discoverTests();
  }

  private registerCommands(): void {
    const commands: [string, (...args: never[]) => unknown][] = [
      [COMMANDS.SET_STARTING_FOLDER, () => this.setStartingFolder()],
      [COMMANDS.SET_PROJECT_PATH, () => this.setProjectPath()],
      [COMMANDS.SET_RUN_VARIABLES, () => this.setRunVariables()],
      [COMMANDS.SET_CYPRESS_EXECUTABLE, () => this.setCypressExecutable()],
    ];

    for (const [id, handler] of commands) {
      this.context.subscriptions.push(vscode.commands.registerCommand(id, handler));
    }
  }

  private setupConfigurationListener(): void {
    const disposable = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration(`${CONFIG.SECTION}.${CONFIG.STARTING_FOLDER}`) ||
        e.affectsConfiguration(`${CONFIG.SECTION}.${CONFIG.PROJECT_PATH}`)
      ) {
        this.discoverTests();
      }
    });
    this.disposables.push(disposable);
  }

  private setupFileWatcher(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }

    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const globSuffix = this.buildExtensionGlob();
    const pattern = new vscode.RelativePattern(workspaceRoot, `**/*${globSuffix}`);
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.fileWatcher.onDidCreate(() => this.discoverTests());
    this.fileWatcher.onDidDelete(() => this.discoverTests());
    this.disposables.push(this.fileWatcher);
  }

  private buildExtensionGlob(): string {
    if (this.testFileExtensions.length === 1) {
      return this.testFileExtensions[0];
    }
    return `.{${this.testFileExtensions.map((e) => e.replace(/^\./, '')).join(',')}}`;
  }

  private async discoverTests(): Promise<void> {
    const workspaceRoot = this.getWorkspaceRoot();
    if (!workspaceRoot) {
      return;
    }

    const projectPath = configService.getProjectPath();
    const resolved = await resolveTestFileExtensions(workspaceRoot, projectPath);
    const previousExtensions = this.testFileExtensions;
    if (resolved) {
      this.testFileExtensions = resolved.extensions;
      this._onPatternsResolved?.(resolved.extensions, resolved.source);
    } else {
      this.testFileExtensions = TEST_FILE_EXTENSIONS;
      this._onPatternsResolved?.(null, null);
    }

    if (previousExtensions.join() !== this.testFileExtensions.join()) {
      this.setupFileWatcher();
    }

    const startingFolder = configService.getStartingFolder();
    const rootDir = startingFolder ? path.join(workspaceRoot, startingFolder) : workspaceRoot;

    const items: vscode.TestItem[] = [];
    await this.scanDirectory(rootDir, items);
    this.controller.items.replace(items);
  }

  private async scanDirectory(dir: string, result: vscode.TestItem[]): Promise<boolean> {
    try {
      await fs.promises.access(dir);
    } catch {
      return false;
    }

    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    let hasTests = false;

    const sorted = [...entries].sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) {
        return -1;
      }
      if (!a.isDirectory() && b.isDirectory()) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

    for (const entry of sorted) {
      const filePath = path.join(dir, entry.name);
      const uri = vscode.Uri.file(filePath);

      if (entry.isDirectory()) {
        const dirItem = this.controller.createTestItem(filePath, entry.name, uri);
        const children: vscode.TestItem[] = [];
        const childHasTests = await this.scanDirectory(filePath, children);
        if (childHasTests) {
          for (const child of children) {
            dirItem.children.add(child);
          }
          result.push(dirItem);
          hasTests = true;
        }
      } else if (this.isTestFile(entry.name)) {
        const fileItem = this.controller.createTestItem(filePath, entry.name, uri);
        result.push(fileItem);
        hasTests = true;
      }
    }

    return hasTests;
  }

  private isTestFile(filename: string): boolean {
    return this.testFileExtensions.some((ext) => filename.endsWith(ext));
  }

  private async runHandler(
    request: vscode.TestRunRequest,
    token: vscode.CancellationToken,
  ): Promise<void> {
    const run = this.controller.createTestRun(request);
    const items = this.collectTestItems(request);

    for (const item of items) {
      if (token.isCancellationRequested) {
        break;
      }
      if (!item.uri) {
        continue;
      }

      run.started(item);
      const testPath = vscode.workspace.asRelativePath(item.uri.fsPath);
      const command = buildCommand('run', testPath);
      const env = getEnvironmentVariables();

      log(`Running: ${command}`);

      try {
        const exitCode = await this.executeTask(command, env, item.label, 'run');
        if (exitCode === 0) {
          run.passed(item);
          log(`Passed: ${item.label}`);
        } else {
          run.failed(item, new vscode.TestMessage(`Test failed (exit code ${exitCode})`));
          log(`Failed: ${item.label} (exit code ${exitCode})`);
        }
      } catch (err) {
        run.failed(item, new vscode.TestMessage(`Error: ${err}`));
        log(`Error running ${item.label}: ${err}`);
      }
    }

    run.end();
  }

  private async openHandler(
    request: vscode.TestRunRequest,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const run = this.controller.createTestRun(request);
    const items = this.collectTestItems(request);

    for (const item of items) {
      if (!item.uri) {
        continue;
      }

      const testPath = vscode.workspace.asRelativePath(item.uri.fsPath);
      const command = buildCommand('open', testPath);
      const env = getEnvironmentVariables();

      log(`Opening in Cypress: ${item.label} — ${command}`);

      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        `Open Test: ${item.label}`,
        'Cypress Test Explorer',
        new vscode.ShellExecution(command, { env }),
      );
      task.isBackground = true;

      vscode.tasks.executeTask(task);
    }

    run.end();
  }

  private collectTestItems(request: vscode.TestRunRequest): vscode.TestItem[] {
    const items: vscode.TestItem[] = [];

    if (request.include) {
      for (const item of request.include) {
        this.collectLeafItems(item, items);
      }
    } else {
      this.controller.items.forEach((item) => {
        this.collectLeafItems(item, items);
      });
    }

    const excludeIds = new Set(request.exclude?.map((item) => item.id) || []);
    return items.filter((item) => !excludeIds.has(item.id));
  }

  private collectLeafItems(item: vscode.TestItem, result: vscode.TestItem[]): void {
    if (item.children.size === 0) {
      result.push(item);
    } else {
      item.children.forEach((child) => this.collectLeafItems(child, result));
    }
  }

  private executeTask(
    command: string,
    env: Record<string, string>,
    testName: string,
    mode: 'run' | 'open',
  ): Promise<number> {
    return new Promise<number>((resolve) => {
      const taskName = `${mode === 'open' ? 'Open' : 'Run'} Test: ${testName}`;

      const task = new vscode.Task(
        { type: 'shell' },
        vscode.TaskScope.Workspace,
        taskName,
        'Cypress Test Explorer',
        new vscode.ShellExecution(command, { env }),
      );

      const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
        if (e.execution.task.name === taskName) {
          disposable.dispose();
          resolve(e.exitCode ?? 1);
        }
      });

      this.disposables.push(disposable);
      vscode.tasks.executeTask(task);
    });
  }

  private getWorkspaceRoot(): string {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
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
      this.discoverTests();
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
      this.discoverTests();
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
    }
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

  set onPatternsResolved(
    callback: (extensions: string[] | null, source: string | null) => void,
  ) {
    this._onPatternsResolved = callback;
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
