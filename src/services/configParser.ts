import * as fs from 'fs';
import * as path from 'path';
import { log } from './logger';

const CONFIG_FILENAMES = [
  'cypress.config.ts',
  'cypress.config.js',
  'cypress.config.mjs',
  'cypress.config.cjs',
];

export interface ResolvedExtensions {
  extensions: string[];
  source: string;
}

export async function resolveTestFileExtensions(
  workspaceRoot: string,
  projectPath: string,
): Promise<ResolvedExtensions | null> {
  const searchDir = projectPath
    ? path.join(workspaceRoot, projectPath)
    : workspaceRoot;

  const configFile = await findConfigFile(searchDir);
  if (!configFile) {
    return null;
  }

  try {
    const content = await fs.promises.readFile(configFile, 'utf-8');
    const patterns = parseSpecPattern(content);
    if (!patterns || patterns.length === 0) {
      return null;
    }

    const extensions = extractExtensionsFromGlobs(patterns);
    if (extensions.length === 0) {
      return null;
    }

    const source = path.basename(configFile);
    log(`Resolved test extensions from ${source}: ${extensions.join(', ')}`);
    return { extensions, source };
  } catch {
    return null;
  }
}

async function findConfigFile(dir: string): Promise<string | null> {
  for (const name of CONFIG_FILENAMES) {
    const filePath = path.join(dir, name);
    try {
      await fs.promises.access(filePath);
      return filePath;
    } catch {
      // continue
    }
  }
  return null;
}

export function parseSpecPattern(configText: string): string[] | null {
  const patterns: string[] = [];

  const stringPattern = /specPattern\s*:\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = stringPattern.exec(configText)) !== null) {
    patterns.push(match[1]);
  }

  const arrayPattern = /specPattern\s*:\s*\[([^\]]+)\]/g;
  while ((match = arrayPattern.exec(configText)) !== null) {
    const items = match[1].matchAll(/['"]([^'"]+)['"]/g);
    for (const item of items) {
      if (!patterns.includes(item[1])) {
        patterns.push(item[1]);
      }
    }
  }

  return patterns.length > 0 ? patterns : null;
}

export function extractExtensionsFromGlobs(globs: string[]): string[] {
  const extensions = new Set<string>();

  for (const glob of globs) {
    const suffixMatch = glob.match(/\*(\.[^/{}*]+(?:\.\{[^}]+\})?)$/);
    if (suffixMatch) {
      const suffix = suffixMatch[1];
      expandBraces(suffix).forEach((ext) => extensions.add(ext));
      continue;
    }

    const simpleMatch = glob.match(/\*(\.[^/{}*]+\.[^/{}*]+)$/);
    if (simpleMatch) {
      extensions.add(simpleMatch[1]);
      continue;
    }

    const extMatch = glob.match(/\*(\.[^/{}*]+)$/);
    if (extMatch) {
      extensions.add(extMatch[1]);
    }
  }

  return [...extensions];
}

function expandBraces(pattern: string): string[] {
  const braceMatch = pattern.match(/^(.+)\.\{([^}]+)\}$/);
  if (!braceMatch) {
    return [pattern];
  }

  const prefix = braceMatch[1];
  const variants = braceMatch[2].split(',').map((v) => v.trim());
  return variants.map((v) => `${prefix}.${v}`);
}
