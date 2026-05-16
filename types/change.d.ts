/**
 * Code Change Types
 */
export interface CodeChange {
    filePath: string;
    before: string;
    after: string;
    diff: string;
    timestamp: string;
}
export interface ChangeSet {
    id: string;
    checkpointRef: string;
    changes: CodeChange[];
    description?: string;
    timestamp: string;
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
//# sourceMappingURL=change.d.ts.map