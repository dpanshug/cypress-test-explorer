import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { getNonce } from './getNonce';

interface FileNode {
  name: string;
  path: string;
  children?: FileNode[];
}

export class SidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken,
  ) {
    console.log('Resolving webview view');
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._setWebviewMessageListener(webviewView.webview);

    console.log('Webview view resolved');

    this._updateCypressFileList();

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        console.log('Webview became visible');
        this._updateCypressFileList();
      }
    });
  }

  public revive(panel: vscode.WebviewView) {
    this._view = panel;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(async (message) => {
      switch (message.type) {
        case 'onInfo':
          if (message.value) {
            vscode.window.showInformationMessage(message.value);
          }
          break;
        case 'onError':
          if (message.value) {
            vscode.window.showErrorMessage(message.value);
          }
          break;
        case 'refreshFileList':
          console.log('Refresh file list requested');
          this._updateCypressFileList();
          break;
        case 'openFile':
          const document = await vscode.workspace.openTextDocument(message.path);
          await vscode.window.showTextDocument(document);
          break;
      }
    });
  }

  private async _updateCypressFileList() {
    console.log('_updateCypressFileList called');
    if (!this._view) {
      console.log('_view is undefined');
      return;
    }

    const cypressFiles = await this._getCypressFiles();
    console.log('Cypress files found:', cypressFiles);

    const fileTree = this._buildFileTree(cypressFiles);
    const treeHtml = this._generateTreeHtml(fileTree);

    this._view.webview.postMessage({
      type: 'updateFileTreeHtml',
      html: treeHtml,
    });
  }

  private _buildFileTree(files: string[]): FileNode[] {
    const root: FileNode[] = [];

    for (const file of files) {
      const parts = file.split(path.sep);
      let currentLevel = root;

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        let existingPath = currentLevel.find((node) => node.name === part);

        if (!existingPath) {
          const newPath: FileNode = {
            name: part,
            path: parts.slice(0, i + 1).join(path.sep),
          };

          if (i < parts.length - 1) {
            newPath.children = [];
          }

          currentLevel.push(newPath);
          existingPath = newPath;
        }

        if (i < parts.length - 1) {
          currentLevel = existingPath.children!;
        }
      }
    }

    return root;
  }

  private _generateTreeHtml(nodes: FileNode[], level: number = 0): string {
    let html = '<ul' + (level === 0 ? ' id="cypress-file-tree"' : '') + '>';

    for (const node of nodes) {
      const indent = '  '.repeat(level);
      html += `\n${indent}<li>`;
      if (node.children) {
        html += `<span class="folder">${node.name}</span>`;
        html += this._generateTreeHtml(node.children, level + 1);
      } else {
        html += `<span class="file" data-path="${node.path}">${node.name}</span>`;
      }
      html += '</li>';
    }

    html += `\n${'  '.repeat(level > 0 ? level - 1 : 0)}</ul>`;
    return html;
  }

  private async _getCypressFiles(): Promise<string[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      console.log('No workspace folders found');
      return [];
    }

    const cypressFiles: string[] = [];
    for (const folder of workspaceFolders) {
      const files = await this._findCypressFiles(folder.uri.fsPath);
      cypressFiles.push(...files);
    }

    return cypressFiles;
  }

  private async _findCypressFiles(dir: string): Promise<string[]> {
    console.log('Searching for Cypress files in:', dir);
    const files = await fs.promises.readdir(dir);
    const cypressFiles: string[] = [];

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = await fs.promises.stat(filePath);

      if (stat.isDirectory()) {
        cypressFiles.push(...(await this._findCypressFiles(filePath)));
      } else if (file.endsWith('.cy.ts')) {
        console.log('Found Cypress file:', filePath);
        cypressFiles.push(filePath);
      }
    }

    return cypressFiles;
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'),
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'compiled/sidebar.js'),
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'out', 'compiled/sidebar.css'),
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <title>Cypress Files</title>
        <style>
          .folder { cursor: pointer; }
          .folder::before { content: '📁 '; }
          .folder.open::before { content: '📂 '; }
          .file::before { content: '📄 '; }
          ul { padding-left: 1.2em; }
        </style>
			</head>
      <body>
        <h1>Cypress Files</h1>
        <button id="refresh-button">Refresh File List</button>
        <div id="cypress-file-tree"></div>
				<script nonce="${nonce}" src="${scriptUri}"></script>
        <script nonce="${nonce}">
          (function() {
            const vscode = acquireVsCodeApi();
            
            document.getElementById('refresh-button').addEventListener('click', () => {
              vscode.postMessage({ type: 'refreshFileList' });
            });

            window.addEventListener('message', event => {
              const message = event.data;
              switch (message.type) {
                case 'updateFileTreeHtml':
                  document.getElementById('cypress-file-tree').innerHTML = message.html;
                  console.log('File tree updated');
                  setupTreeInteractions();
                  break;
              }
            });

            function setupTreeInteractions() {
              document.querySelectorAll('.folder').forEach(folder => {
                folder.addEventListener('click', () => {
                  folder.classList.toggle('open');
                  const ul = folder.nextElementSibling;
                  if (ul && ul.tagName === 'UL') {
                    ul.style.display = ul.style.display === 'none' ? 'block' : 'none';
                  }
                });
              });

              document.querySelectorAll('.file').forEach(file => {
                file.addEventListener('click', () => {
                  const filePath = file.getAttribute('data-path');
                  vscode.postMessage({ type: 'openFile', path: filePath });
                });
              });
            }

            setupTreeInteractions();
          }())
        </script>
			</body>
			</html>`;
  }
}
