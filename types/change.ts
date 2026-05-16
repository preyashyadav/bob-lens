/**
 * Code Change Types
 */

export interface FileChange {
  filePath: string;
  fileType: 'frontend' | 'backend' | 'config';
  before: string;
  after: string;
  diff: string;
}

export interface ChangeSet {
  id: string;
  checkpointRef: string;
  description?: string;
  timestamp: string;
  changes: FileChange[];
}

export interface DiffLine {
  type: 'add' | 'remove' | 'context';
  lineNumber: number;
  content: string;
}

export interface FileDiff {
  filePath: string;
  lines: DiffLine[];
  additions: number;
  deletions: number;
}

// Made with Bob
