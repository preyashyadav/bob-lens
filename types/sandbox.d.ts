/**
 * Sandbox Execution Types
 */
export type Framework = 'react' | 'node';
export interface ExecutionRequest {
    code: string;
    testInputs: Record<string, any>;
    framework: Framework;
    targetFile?: string;
}
export interface ExecutionResult {
    success: boolean;
    output?: any;
    screenshot?: string;
    error?: string;
    executionTime: number;
    logs?: string[];
}
export interface VMContext {
    testInputs: Record<string, any>;
    console: {
        log: (...args: any[]) => void;
        error: (...args: any[]) => void;
    };
}
export interface ScreenshotOptions {
    width?: number;
    height?: number;
    fullPage?: boolean;
}
//# sourceMappingURL=sandbox.d.ts.map