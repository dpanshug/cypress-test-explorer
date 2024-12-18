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
          .error { color: var(--vscode-errorForeground); margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="info">
          Define environment variables to prefix the Cypress run command.  
          <br><br>
          Enter run variables as KEY=VALUE pairs, one per line.
          Invalid entries will be ignored.
        </div>
        <textarea id="runVars" placeholder="KEY1=VALUE1&#10;KEY2=VALUE2"></textarea>
        <button id="saveButton">Save</button>

        <div id="errorMessage" class="error"></div>
        <script>
          const vscode = acquireVsCodeApi();
          const textarea = document.getElementById('runVars');
          const saveButton = document.getElementById('saveButton');
          const errorMessage = document.getElementById('errorMessage');

          vscode.postMessage({ type: 'getVariables' });

          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'update':
                textarea.value = message.value;
                break;
              case 'error':
                errorMessage.textContent = message.value;
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
    const runVars = config.get<Record<string, string>>('runVariables', {});
    return Object.entries(runVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }

  private async _saveRunVariables(envString: string): Promise<void> {
    const lines = envString.split('\n');
    const runVars: Record<string, string> = {};
    const invalidLines: string[] = [];

    lines.forEach((line, index) => {
      line = line.trim();
      if (line) {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          runVars[key.trim()] = value.trim();
        } else {
          invalidLines.push(`Line ${index + 1}: ${line}`);
        }
      }
    });

    if (invalidLines.length > 0) {
      const errorMessage = `The following lines are invalid and will be ignored:\n${invalidLines.join('\n')}`;
      this._view?.webview.postMessage({ type: 'error', value: errorMessage });
    } else {
      this._view?.webview.postMessage({ type: 'error', value: '' });
    }

    await vscode.workspace
      .getConfiguration('cypressTestExplorer')
      .update('runVariables', runVars, vscode.ConfigurationTarget.Workspace);

    vscode.window.showInformationMessage('Cypress run variables updated');
    this._view?.webview.postMessage({ type: 'update', value: this._getRunVariables() });
  }
}
