interface RunTestArgs {
    testInputs: Record<string, any>;
    targetFiles: string[];
    checkpointRef: string;
}
export declare function runTestHandler(args: RunTestArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=run-test.d.ts.map