/**
 * MCP Tool Input Types
 */

export interface NotifyChangeInput {
  changedFiles: string[];
  checkpointRef: string;
  changeDescription?: string;
}

export interface AskBobInput {
  question: string;
  context: {
    files: string[];
    changes: Record<string, any>;
  };
}

export interface RunTestInput {
  testInputs: Record<string, any>;
  targetFiles: string[];
  checkpointRef: string;
}

/**
 * MCP Tool Output Types
 */

export interface NotifyChangeOutput {
  success: boolean;
  message: string;
  changeId: string;
}

export interface AskBobOutput {
  success: boolean;
  answer: string;
  context?: Record<string, any>;
}

export interface RunTestOutput {
  success: boolean;
  executionResult: any;
  screenshot?: string;
  error?: string;
}

// Made with Bob
