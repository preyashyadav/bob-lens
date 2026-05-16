import type { ChangeSet } from '../../../types/change.js';
interface TrackChangeInput {
    changedFiles: string[];
    checkpointRef: string;
    description?: string;
}
export declare function trackChange(input: TrackChangeInput): Promise<string>;
export declare function getChange(changeId: string): ChangeSet | undefined;
export declare function getAllChanges(): ChangeSet[];
export {};
//# sourceMappingURL=change-tracker.d.ts.map