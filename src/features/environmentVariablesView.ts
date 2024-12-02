import * as vscode from 'vscode';

export class EnvironmentVariablesView {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._setWebviewMessageListener(webviewView.webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const currentEnv = vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .get('environmentVariables', {});
    const envString = Object.entries(currentEnv)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cypress Environment Variables</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; }
                    textarea { width: 100%; height: 200px; margin-bottom: 10px; }
                    button { background-color: #007acc; color: white; border: none; padding: 8px 12px; cursor: pointer; }
                </style>
            </head>
            <body>
                <p>Set the enviroment variables</p>
                <textarea id="envVars" placeholder="KEY1=VALUE1&#10;KEY2=VALUE2">${envString}</textarea>
                <button id="saveButton">Save</button>
                <script>
                    const vscode = acquireVsCodeApi();
                    document.getElementById('saveButton').addEventListener('click', () => {
                        const envVars = document.getElementById('envVars').value;
                        vscode.postMessage({ command: 'save', envVars: envVars });
                    });
                </script>
            </body>
            </html>
        `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'save':
            const envVars = message.envVars
              .split('\n')
              .reduce((acc: Record<string, string>, line: string) => {
                const [key, value] = line.split('=');
                if (key && value) acc[key.trim()] = value.trim();
                return acc;
              }, {});
            await vscode.workspace
              .getConfiguration('cypressTestExplorer')
              .update('environmentVariables', envVars, true);
            vscode.window.showInformationMessage('Cypress environment variables updated');
            return;
        }
      },
      undefined,
      [],
    );
  }
}
