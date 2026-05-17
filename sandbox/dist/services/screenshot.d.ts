interface ScreenshotOptions {
    waitTime?: number;
    fullPage?: boolean;
    width?: number;
    height?: number;
}
export declare function captureScreenshot(code: string, _testInputs: any, _options?: ScreenshotOptions): Promise<string | null>;
export declare function renderComponentScreenshots(beforeCode: string, afterCode: string, componentName: string): Promise<{
    before: string;
    after: string;
    error?: string;
}>;
export {};
//# sourceMappingURL=screenshot.d.ts.map