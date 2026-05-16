interface AskBobArgs {
    question: string;
    context: {
        files: string[];
        changes: Record<string, any>;
    };
}
export declare function askBobHandler(args: AskBobArgs): Promise<{
    content: {
        type: string;
        text: string;
    }[];
}>;
export {};
//# sourceMappingURL=ask-bob.d.ts.map