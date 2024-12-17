import * as vscode from 'vscode';

export class RunVariablesView {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview();

    this._setWebviewMessageListener(webviewView.webview);

    // Update content when the view becomes visible
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        webviewView.webview.postMessage({ type: 'update', value: this._getRunVariables() });
      }
    });
  }

  private _getHtmlForWebview() {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cypress Run Variables</title>
        <style>
          body { font-family: var(--vscode-font-family); padding: 10px; }
          textarea { width: 100%; height: 200px; margin-bottom: 10px; }
          button { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 8px 12px; cursor: pointer; }
          .info { margin-bottom: 10px; color: var(--vscode-foreground); }
        </style>
      </head>
      <body>
        <div class="info">
          These variables will be prefixed to the Cypress run command. 
        </div>
        <textarea id="envVars" placeholder="KEY1=VALUE1&#10;KEY2=VALUE2"></textarea>
        <button id="saveButton">Save</button>
        <script>
          const vscode = acquireVsCodeApi();
          const textarea = document.getElementById('envVars');
          const saveButton = document.getElementById('saveButton');

          // Initial load
          vscode.postMessage({ type: 'getVariables' });

          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'update':
                textarea.value = message.value;
                break;
            }
          });

          saveButton.addEventListener('click', () => {
            vscode.postMessage({ type: 'save', value: textarea.value });
          });
        </script>
      </body>
      </html>
    `;
  }

  private _setWebviewMessageListener(webview: vscode.Webview) {
    webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'save':
            await this._saveRunVariables(message.value);
            vscode.window.showInformationMessage('Cypress run variables updated');
            break;
          case 'getVariables':
            webview.postMessage({ type: 'update', value: this._getRunVariables() });
            break;
        }
      },
      undefined,
      [],
    );
  }

  private _getRunVariables(): string {
    const config = vscode.workspace.getConfiguration('cypressTestExplorer');
    const runVars = config.get<Record<string, string>>('runVariables', {}); // Changed from 'environmentVariables' to 'runVariables'
    return Object.entries(runVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }

  private async _saveRunVariables(envString: string): Promise<void> {
    const runVars = envString.split('\n').reduce((acc: Record<string, string>, line: string) => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        acc[key.trim()] = valueParts.join('=').trim();
      }
      return acc;
    }, {});

    await vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .update('runVariables', runVars, vscode.ConfigurationTarget.Workspace); // Changed from 'environmentVariables' to 'runVariables'
  }
}
