import * as vscode from 'vscode';
import { CONFIG } from '../constants';

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIG.SECTION);
}

export function getStartingFolder(): string {
  return getConfig().get<string>(CONFIG.STARTING_FOLDER, '');
}

export function getCypressExecutable(): string {
  return getConfig().get<string>(CONFIG.CYPRESS_EXECUTABLE, 'npx cypress');
}

export function getConfigFilePath(): string {
  return getConfig().get<string>(CONFIG.CONFIG_FILE_PATH, '');
}

export function getProjectPath(): string {
  return getConfig().get<string>(CONFIG.PROJECT_PATH, '');
}

export function getRunVariables(): Record<string, string> {
  return getConfig().get<Record<string, string>>(CONFIG.RUN_VARIABLES, {});
}

export function getBrowser(): string {
  return getConfig().get<string>(CONFIG.BROWSER, '');
}

export async function updateStartingFolder(value: string): Promise<void> {
  await getConfig().update(CONFIG.STARTING_FOLDER, value, true);
}

export async function updateCypressExecutable(value: string): Promise<void> {
  await getConfig().update(CONFIG.CYPRESS_EXECUTABLE, value, true);
}

export async function updateProjectPath(value: string): Promise<void> {
  await getConfig().update(CONFIG.PROJECT_PATH, value, true);
}

export async function updateRunVariables(
  value: Record<string, string>,
  target: vscode.ConfigurationTarget = vscode.ConfigurationTarget.Global,
): Promise<void> {
  await getConfig().update(CONFIG.RUN_VARIABLES, value, target);
}
