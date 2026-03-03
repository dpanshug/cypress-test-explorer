import * as vscode from 'vscode';
import * as path from 'path';
import { TestFile } from '../models/testFile';
import * as configService from './configService';
import { log } from './logger';

interface QueuedTest {
  command: string;
  testName: string;
}

export class CypressRunner implements vscode.Disposable {
  private testQueue: QueuedTest[] = [];
  private isRunning = false;
  private currentTest: string | null = null;
  private disposables: vscode.Disposable[] = [];

  queueTest(test: TestFile): void {
    const testPath = vscode.workspace.asRelativePath(test.resourceUri.fsPath);
    const command = this.buildCommand(testPath);
    const testName = path.basename(testPath);

    this.testQueue.push({ command, testName });
    vscode.window.showInformationMessage(`Test queued: ${testName}`);
    log(`Test queued: ${testName} — ${command}`);

    if (!this.isRunning) {
      this.runNext();
    }
  }

  queueAllTests(): void {
    const startingFolder = configService.getStartingFolder();
    const specPattern = startingFolder ? `'${startingFolder}/*.cy.{js,ts,jsx,tsx}'` : '';
    const command = this.buildCommand(specPattern);

    this.testQueue.push({ command, testName: 'All Tests' });
    vscode.window.showInformationMessage('All tests queued');
    log(`All tests queued — ${command}`);

    if (!this.isRunning) {
      this.runNext();
    }
  }

  private buildCommand(spec?: string): string {
    const cypressExecutable = configService.getCypressExecutable();
    const projectPath = configService.getProjectPath();
    const configFilePath = configService.getConfigFilePath();
    const envVars = configService.getRunVariables();

    const parts: string[] = [];

    const envString = Object.entries(envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ');
    if (envString) {
      parts.push(envString);
    }

    parts.push(cypressExecutable, 'run');

    if (projectPath) {
      parts.push(`--project "${projectPath}"`);
    }
    if (configFilePath) {
      parts.push(`--config-file "${configFilePath}"`);
    }
    if (spec) {
      parts.push(`--spec "${spec}"`);
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
    const { command, testName } = this.testQueue.shift()!;
    this.currentTest = testName;

    vscode.window.showInformationMessage(`Running test: ${this.currentTest}`);
    log(`Running: ${command}`);

    const task = new vscode.Task(
      { type: 'shell' },
      vscode.TaskScope.Workspace,
      `Run Test: ${testName}`,
      'Cypress Test Explorer',
      new vscode.ShellExecution(command),
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
