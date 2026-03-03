import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Cypress Test Explorer');
  }
  return outputChannel;
}

export function log(message: string): void {
  getOutputChannel().appendLine(`[${new Date().toISOString()}] ${message}`);
}

export function logError(message: string, error?: unknown): void {
  const errorMsg = error instanceof Error ? error.message : String(error ?? '');
  getOutputChannel().appendLine(
    `[${new Date().toISOString()}] ERROR: ${message}${errorMsg ? ` — ${errorMsg}` : ''}`,
  );
}

export function disposeLogger(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
