import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as configService from '../services/configService';
import { log, logError } from '../services/logger';

export class RunVariablesViewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._setWebviewMessageListener(webviewView.webview);

    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        this._sendAllVariables();
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = crypto.randomBytes(16).toString('hex');
    const initialEnvVars = JSON.stringify(configService.getEnvironmentVariables());
    const initialCypressEnv = JSON.stringify(configService.getCypressEnv());
    const initialConfig = JSON.stringify({
      startingFolder: configService.getStartingFolder(),
      projectPath: configService.getProjectPath(),
      configFilePath: configService.getConfigFilePath(),
      cypressExecutable: configService.getCypressExecutable(),
      browser: configService.getBrowser(),
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <title>Cypress Variables</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      padding: 8px;
      margin: 0;
    }

    .section { margin-bottom: 16px; }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .section-title {
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-sideBarSectionHeader-foreground, var(--vscode-foreground));
    }

    .section-desc {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      margin-bottom: 8px;
    }

    .row {
      display: flex;
      gap: 4px;
      margin-bottom: 4px;
      align-items: center;
    }

    .row input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 3px 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      outline: none;
      min-width: 0;
    }

    .row input:focus {
      border-color: var(--vscode-focusBorder);
    }

    .row input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .delete-btn {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      padding: 2px 4px;
      font-size: 14px;
      line-height: 1;
      border-radius: 3px;
      flex-shrink: 0;
    }

    .delete-btn:hover {
      background: var(--vscode-toolbar-hoverBackground, rgba(90, 93, 94, 0.31));
      color: var(--vscode-errorForeground);
    }

    .actions {
      display: flex;
      gap: 6px;
      margin-top: 6px;
    }

    .add-btn, .save-btn {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      padding: 2px 0;
      font-size: 12px;
      font-family: var(--vscode-font-family);
    }

    .add-btn:hover, .save-btn:hover {
      text-decoration: underline;
    }

    .save-btn {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      padding: 4px 12px;
      border-radius: 2px;
    }

    .save-btn:hover {
      background: var(--vscode-button-hoverBackground);
      text-decoration: none;
    }

    .saved-indicator {
      color: var(--vscode-testing-iconPassed, #73c991);
      font-size: 11px;
      opacity: 0;
      transition: opacity 0.2s;
      margin-left: 6px;
    }

    .saved-indicator.visible { opacity: 1; }

    .empty-state {
      color: var(--vscode-descriptionForeground);
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }

    .separator {
      border: none;
      border-top: 1px solid var(--vscode-sideBarSectionHeader-border, var(--vscode-panel-border, rgba(128,128,128,0.2)));
      margin: 12px 0;
    }

    .config-row {
      margin-bottom: 12px;
    }

    .config-row label {
      display: block;
      font-size: 11px;
      color: var(--vscode-foreground);
      margin-bottom: 3px;
    }

    .config-hint {
      color: var(--vscode-descriptionForeground);
      font-size: 11px;
      margin-top: 3px;
      line-height: 1.4;
    }

    .config-row input,
    .config-row select {
      width: 100%;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, transparent);
      padding: 3px 6px;
      font-family: var(--vscode-editor-font-family, monospace);
      font-size: 12px;
      outline: none;
    }

    .config-row input:focus,
    .config-row select:focus {
      border-color: var(--vscode-focusBorder);
    }

    .config-row input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }

    .config-row select {
      font-family: var(--vscode-font-family);
      cursor: pointer;
    }

    .config-row select option {
      background: var(--vscode-dropdown-background, var(--vscode-input-background));
      color: var(--vscode-dropdown-foreground, var(--vscode-input-foreground));
    }

    .config-info {
      display: none;
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      background: var(--vscode-textBlockQuote-background, rgba(127,127,127,0.1));
      border-left: 3px solid var(--vscode-textLink-foreground);
      padding: 6px 8px;
      margin-top: 10px;
      line-height: 1.4;
    }

    .config-info.visible { display: block; }

    .config-info strong {
      color: var(--vscode-foreground);
    }
  </style>
</head>
<body>
  <div class="section" id="configSection">
    <div class="section-header">
      <span class="section-title">Configuration</span>
    </div>
    <div class="section-desc">All fields are optional — leave empty to use defaults</div>
    <div class="config-row">
      <label for="startingFolder">Tests Directory</label>
      <input type="text" id="startingFolder" placeholder="e.g. cypress/e2e">
      <div class="config-hint">Folder to scan for *.cy.{ts,js} test files (relative to workspace root)</div>
    </div>
    <div class="config-row">
      <label for="projectPath">Cypress Project</label>
      <input type="text" id="projectPath" placeholder="e.g. packages/cypress">
      <div class="config-hint">Directory containing your cypress.config file (passed as --project)</div>
    </div>
    <div class="config-row">
      <label for="configFilePath">Config File</label>
      <input type="text" id="configFilePath" placeholder="e.g. cypress.config.ts">
      <div class="config-hint">Only needed if the config file has a non-standard name or location</div>
    </div>
    <div class="config-row">
      <label for="cypressExecutable">Cypress Command</label>
      <input type="text" id="cypressExecutable" placeholder="npx cypress">
      <div class="config-hint">Command used to run Cypress (default: npx cypress)</div>
    </div>
    <div class="config-row">
      <label for="browser">Browser</label>
      <select id="browser">
        <option value="">Default (Cypress chooses)</option>
        <option value="chrome">Chrome</option>
        <option value="firefox">Firefox</option>
        <option value="edge">Edge</option>
        <option value="electron">Electron</option>
      </select>
    </div>
    <div class="actions">
      <span style="flex:1"></span>
      <button class="save-btn" id="saveConfig">Save</button>
      <span class="saved-indicator" id="configSaved">Saved</span>
    </div>
    <div class="config-info" id="resolvedPatterns"></div>
  </div>

  <hr class="separator">

  <div class="section" id="envVarsSection">
    <div class="section-header">
      <span class="section-title">Environment Variables</span>
    </div>
    <div class="section-desc">OS-level variables for the Cypress process</div>
    <div id="envVarsRows"></div>
    <div class="actions">
      <a class="add-btn" id="addEnvVar">+ Add Variable</a>
      <span style="flex:1"></span>
      <button class="save-btn" id="saveEnvVars">Save</button>
      <span class="saved-indicator" id="envVarsSaved">Saved</span>
    </div>
  </div>

  <hr class="separator">

  <div class="section" id="cypressEnvSection">
    <div class="section-header">
      <span class="section-title">Cypress Env</span>
    </div>
    <div class="section-desc">Passed via --env, accessed with Cypress.env()</div>
    <div id="cypressEnvRows"></div>
    <div class="actions">
      <a class="add-btn" id="addCypressEnv">+ Add Variable</a>
      <span style="flex:1"></span>
      <button class="save-btn" id="saveCypressEnv">Save</button>
      <span class="saved-indicator" id="cypressEnvSaved">Saved</span>
    </div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function createRow(container, key, value) {
      const row = document.createElement('div');
      row.className = 'row';

      const keyInput = document.createElement('input');
      keyInput.type = 'text';
      keyInput.placeholder = 'KEY';
      keyInput.value = key || '';

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.placeholder = 'value';
      valueInput.value = value || '';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '\\u00d7';
      deleteBtn.title = 'Remove';
      deleteBtn.addEventListener('click', () => row.remove());

      row.appendChild(keyInput);
      row.appendChild(valueInput);
      row.appendChild(deleteBtn);
      container.appendChild(row);

      if (!key) keyInput.focus();
    }

    function renderRows(containerId, vars) {
      const container = document.getElementById(containerId);
      container.innerHTML = '';
      const entries = Object.entries(vars);
      if (entries.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'empty-state';
        empty.textContent = 'No variables set';
        container.appendChild(empty);
        return;
      }
      entries.forEach(([key, value]) => createRow(container, key, value));
    }

    function collectVars(containerId) {
      const container = document.getElementById(containerId);
      const rows = container.querySelectorAll('.row');
      const vars = {};
      rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const key = inputs[0].value.trim();
        const value = inputs[1].value.trim();
        if (key) vars[key] = value;
      });
      return vars;
    }

    function flashSaved(id) {
      const el = document.getElementById(id);
      el.classList.add('visible');
      setTimeout(() => el.classList.remove('visible'), 1500);
    }

    function renderConfig(config) {
      document.getElementById('startingFolder').value = config.startingFolder || '';
      document.getElementById('projectPath').value = config.projectPath || '';
      document.getElementById('configFilePath').value = config.configFilePath || '';
      document.getElementById('cypressExecutable').value = config.cypressExecutable || '';
      document.getElementById('browser').value = config.browser || '';
    }

    function collectConfig() {
      return {
        startingFolder: document.getElementById('startingFolder').value.trim(),
        projectPath: document.getElementById('projectPath').value.trim(),
        configFilePath: document.getElementById('configFilePath').value.trim(),
        cypressExecutable: document.getElementById('cypressExecutable').value.trim(),
        browser: document.getElementById('browser').value,
      };
    }

    document.getElementById('saveConfig').addEventListener('click', () => {
      vscode.postMessage({ type: 'saveConfig', value: collectConfig() });
    });

    document.getElementById('addEnvVar').addEventListener('click', () => {
      const container = document.getElementById('envVarsRows');
      const empty = container.querySelector('.empty-state');
      if (empty) empty.remove();
      createRow(container, '', '');
    });

    document.getElementById('addCypressEnv').addEventListener('click', () => {
      const container = document.getElementById('cypressEnvRows');
      const empty = container.querySelector('.empty-state');
      if (empty) empty.remove();
      createRow(container, '', '');
    });

    document.getElementById('saveEnvVars').addEventListener('click', () => {
      const vars = collectVars('envVarsRows');
      vscode.postMessage({ type: 'saveEnvVars', value: vars });
    });

    document.getElementById('saveCypressEnv').addEventListener('click', () => {
      const vars = collectVars('cypressEnvRows');
      vscode.postMessage({ type: 'saveCypressEnv', value: vars });
    });

    window.addEventListener('message', event => {
      const message = event.data;
      switch (message.type) {
        case 'updateConfig':
          renderConfig(message.value);
          break;
        case 'configSaved':
          flashSaved('configSaved');
          break;
        case 'updateResolvedPatterns': {
          const el = document.getElementById('resolvedPatterns');
          if (message.extensions && message.source) {
            el.innerHTML = 'Scanning for: <strong>' + message.extensions.join(', ') + '</strong> (from ' + message.source + ')';
            el.classList.add('visible');
          } else {
            el.classList.remove('visible');
          }
          break;
        }
        case 'updateEnvVars':
          renderRows('envVarsRows', message.value);
          break;
        case 'updateCypressEnv':
          renderRows('cypressEnvRows', message.value);
          break;
        case 'envVarsSaved':
          flashSaved('envVarsSaved');
          break;
        case 'cypressEnvSaved':
          flashSaved('cypressEnvSaved');
          break;
      }
    });

    renderConfig(${initialConfig});
    renderRows('envVarsRows', ${initialEnvVars});
    renderRows('cypressEnvRows', ${initialCypressEnv});
  </script>
</body>
</html>`;
  }

  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      async (message) => {
        try {
          switch (message.type) {
            case 'saveConfig':
              await configService.updateStartingFolder(message.value.startingFolder);
              await configService.updateProjectPath(message.value.projectPath);
              await configService.updateConfigFilePath(message.value.configFilePath);
              await configService.updateCypressExecutable(message.value.cypressExecutable);
              await configService.updateBrowser(message.value.browser);
              log(`Configuration updated: ${JSON.stringify(message.value)}`);
              webview.postMessage({ type: 'configSaved' });
              break;
            case 'saveEnvVars':
              await configService.updateEnvironmentVariables(
                message.value,
                vscode.ConfigurationTarget.Workspace,
              );
              log(`Environment variables updated: ${JSON.stringify(message.value)}`);
              webview.postMessage({ type: 'envVarsSaved' });
              break;
            case 'saveCypressEnv':
              await configService.updateCypressEnv(
                message.value,
                vscode.ConfigurationTarget.Workspace,
              );
              log(`Cypress env updated: ${JSON.stringify(message.value)}`);
              webview.postMessage({ type: 'cypressEnvSaved' });
              break;
            case 'getVariables':
              this._sendAllVariables();
              break;
          }
        } catch (error) {
          logError('Failed to handle webview message', error);
          vscode.window.showErrorMessage('Failed to update variables.');
        }
      },
      undefined,
      [],
    );
  }

  public updateResolvedPatterns(extensions: string[] | null, source: string | null): void {
    this._view?.webview.postMessage({
      type: 'updateResolvedPatterns',
      extensions,
      source,
    });
  }

  private _sendAllVariables(): void {
    this._view?.webview.postMessage({
      type: 'updateConfig',
      value: {
        startingFolder: configService.getStartingFolder(),
        projectPath: configService.getProjectPath(),
        configFilePath: configService.getConfigFilePath(),
        cypressExecutable: configService.getCypressExecutable(),
        browser: configService.getBrowser(),
      },
    });
    this._view?.webview.postMessage({
      type: 'updateEnvVars',
      value: configService.getEnvironmentVariables(),
    });
    this._view?.webview.postMessage({
      type: 'updateCypressEnv',
      value: configService.getCypressEnv(),
    });
  }
}
