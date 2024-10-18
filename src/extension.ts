import * as vscode from 'vscode';
import { exec } from 'child_process';
import path from 'path';
const odhDashboardDirectory = path.resolve(__dirname, '../../odh-dashboard/frontend');
// const currentDirectory = path.resolve(__dirname, "../..");
const cypressRun = `cd ${odhDashboardDirectory} && npm i && npm run cypress:server:dev`;
const cypressExecute = `cd ${odhDashboardDirectory} && npm i && npm run cypress:open:mock`;

let myStatusBarItem: vscode.StatusBarItem;
let isStarted = false;
import { createStatusBarButton } from './StatusBarButton';
import { SidebarProvider } from './SidebarProvider';

export function activate(context: vscode.ExtensionContext) {
  createStatusBarButton(context);

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('cypressFileExplorer', sidebarProvider),
  );

  // To check if the extension is working
  let disposableHelloWorld = vscode.commands.registerCommand('extension.helloWorld', () => {
    vscode.window.showInformationMessage('Hello World');
  });

  let disposable = vscode.commands.registerCommand('extension.startCypressServer', () => {
    isStarted = !isStarted;
    if (isStarted) {
      exec(cypressRun, { cwd: odhDashboardDirectory }, (error, stdout, stderr) => {
        if (stdout) {
          vscode.window.showInformationMessage(`Cypress Server started`);
        }
        if (error) {
          vscode.window.showErrorMessage(`Error: ${error.message}`);
          return;
        }
        if (stderr) {
          vscode.window.showErrorMessage(`Error: ${stderr}`);
          return;
        }
        vscode.window.showInformationMessage(`Cypress Server Started: ${stdout}`);
      });
    } else {
      vscode.window.showInformationMessage(`Cypress Server stopped `);
    }
  });

  context.subscriptions.push(myStatusBarItem);
  context.subscriptions.push(disposable);
  context.subscriptions.push(disposableHelloWorld);
}

export function deactivate() {}
