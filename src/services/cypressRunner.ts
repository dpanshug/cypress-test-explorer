import * as vscode from 'vscode';
import * as path from 'path';
import { TestFile } from '../models/testFile';
import * as configService from './configService';
import { log } from './logger';

interface QueuedTest {
  command: string;
  testName: string;
  env: Record<string, string>;
}

export class CypressRunner implements vscode.Disposable {
  private testQueue: QueuedTest[] = [];
  private isRunning = false;
  private currentTest: string | null = null;
  private disposables: vscode.Disposable[] = [];

  queueTest(test: TestFile): void {
    const testPath = vscode.workspace.asRelativePath(test.resourceUri.fsPath);
    const command = this.buildCommand('run', testPath);
    const env = configService.getEnvironmentVariables();
    const testName = path.basename(testPath);

    this.testQueue.push({ command, testName, env });
    vscode.window.showInformationMessage(`Test queued: ${testName}`);
    log(`Test queued: ${testName} — ${command}`);

    if (!this.isRunning) {
      this.runNext();
    }
  }

  openTest(test: TestFile): void {
    const testPath = vscode.workspace.asRelativePath(test.resourceUri.fsPath);
    const command = this.buildCommand('open', testPath);
    const env = configService.getEnvironmentVariables();
    const testName = path.basename(testPath);

    log(`Opening in Cypress: ${testName} — ${command}`);

    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      `Open Test: ${testName}`,
      'Cypress Test Explorer',
      new vscode.ShellExecution(command, { env }),
    );
    task.isBackground = true;

    vscode.tasks.executeTask(task);
    vscode.window.showInformationMessage(`Opening in Cypress: ${testName}`);
  }

  queueAllTests(): void {
    const startingFolder = configService.getStartingFolder();
    const specPattern = startingFolder ? `'${startingFolder}/*.cy.{js,ts,jsx,tsx}'` : '';
    const command = this.buildCommand('run', specPattern);
    const env = configService.getEnvironmentVariables();

    this.testQueue.push({ command, testName: 'All Tests', env });
    vscode.window.showInformationMessage('All tests queued');
    log(`All tests queued — ${command}`);

    if (!this.isRunning) {
      this.runNext();
    }
  }

  private buildCommand(mode: 'run' | 'open', spec?: string): string {
    const cypressExecutable = configService.getCypressExecutable();
    const projectPath = configService.getProjectPath();
    const configFilePath = configService.getConfigFilePath();
    const cypressEnv = configService.getCypressEnv();
    const browser = configService.getBrowser();

    const parts: string[] = [];

    parts.push(cypressExecutable, mode);

    if (mode === 'open') {
      parts.push('--e2e');
    }

    if (projectPath) {
      parts.push(`--project "${projectPath}"`);
    }
    if (configFilePath) {
      parts.push(`--config-file "${configFilePath}"`);
    }
    if (spec) {
      const resolvedSpec = projectPath ? path.relative(projectPath, spec) : spec;
      if (mode === 'run') {
        parts.push(`--spec "${spec}"`);
      } else {
        parts.push(`--config specPattern="${resolvedSpec}"`);
      }
    }
    if (browser) {
      parts.push(`--browser ${browser}`);
    } else if (mode === 'open') {
      parts.push('--browser chrome');
    }

    const envFlag = Object.entries(cypressEnv)
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    if (envFlag) {
      parts.push(`--env ${envFlag}`);
    }

    return parts.join(' ');
  }

  private runNext(): void {
    if (this.testQueue.length === 0) {
      this.isRunning = false;
      this.currentTest = null;
      return;
    }

    this.isRunning = true;
    const { command, testName, env } = this.testQueue.shift()!;
    this.currentTest = testName;

    vscode.window.showInformationMessage(`Running test: ${this.currentTest}`);
    log(`Running: ${command}`);

    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      `Run Test: ${testName}`,
      'Cypress Test Explorer',
      new vscode.ShellExecution(command, { env }),
    );

    const disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if (e.execution.task.name === `Run Test: ${testName}`) {
        if (e.exitCode === 0) {
          vscode.window.showInformationMessage('All specs passed!');
          log(`Passed: ${testName}`);
        } else {
          vscode.window.showWarningMessage(`Specs failed: ${testName}`);
          log(`Failed: ${testName} (exit code ${e.exitCode})`);
        }

        disposable.dispose();
        this.runNext();
      }
    });

    this.disposables.push(disposable);
    vscode.tasks.executeTask(task);
  }

  dispose(): void {
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
  }
}
