export interface RunRequestInput {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    endpoint: string;
    headers: Record<string, string>;
    body: Record<string, any>;
    targetFile: string;
    checkpointRef: string;
}
export interface StepResult {
    layer: 'input' | 'middleware' | 'controller' | 'database' | 'response';
    status: 'success' | 'error' | 'skipped';
    input: any;
    output: any;
    duration: number;
    note?: string;
}
export declare function runRequest(input: RunRequestInput): AsyncGenerator<StepResult>;
//# sourceMappingURL=request-runner.d.ts.map