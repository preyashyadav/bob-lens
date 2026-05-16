interface NotifyChangeArgs {
    changedFiles: string[];
    checkpointRef: string;
    changeDescription?: string;
}
export declare function notifyChangeHandler(args: NotifyChangeArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=notify-change.d.ts.map