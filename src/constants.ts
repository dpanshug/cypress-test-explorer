export const EXTENSION_ID = 'cypressTestExplorer';

export const VIEW_IDS = {
  RUN_VARIABLES: 'cypressRunVariables',
} as const;

export const COMMANDS = {
  SET_STARTING_FOLDER: `${EXTENSION_ID}.setStartingFolder`,
  SET_PROJECT_PATH: `${EXTENSION_ID}.setProjectPath`,
  SET_RUN_VARIABLES: `${EXTENSION_ID}.setRunVariables`,
  SET_CYPRESS_EXECUTABLE: `${EXTENSION_ID}.setCypressExecutable`,
  UPDATE_RUN_VARIABLES: `${EXTENSION_ID}.updateRunVariables`,
} as const;

export const CONFIG = {
  SECTION: EXTENSION_ID,
  STARTING_FOLDER: 'startingFolder',
  CYPRESS_EXECUTABLE: 'cypressExecutable',
  CONFIG_FILE_PATH: 'configFilePath',
  PROJECT_PATH: 'projectPath',
  RUN_VARIABLES: 'runVariables',
  ENVIRONMENT_VARIABLES: 'environmentVariables',
  CYPRESS_ENV: 'cypressEnv',
  BROWSER: 'browser',
} as const;

export const TEST_FILE_EXTENSIONS = ['.cy.ts', '.cy.js', '.cy.tsx', '.cy.jsx'] as const;
