import * as path from 'path';
import * as configService from './configService';

export function buildCommand(mode: 'run' | 'open', spec?: string): string {
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

export function getEnvironmentVariables(): Record<string, string> {
  return configService.getEnvironmentVariables();
}
