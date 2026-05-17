import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { notifyChangeHandler } from './tools/notify-change.js';
import { askBobHandler } from './tools/ask-bob.js';
import { runTestHandler } from './tools/run-test.js';
import { analysisCache } from './services/websocket.js';
export function setupMCPTools(server) {
    // Handle tools/list request
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: [
            {
                name: "notify_change",
                description: "Notify Bob Lens of code changes made by Bob",
                inputSchema: {
                    type: "object",
                    properties: {
                        changedFiles: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of changed file paths"
                        },
                        changes: {
                            type: "array",
                            description: "Full change objects (preferred when available)",
                            items: {
                                type: "object",
                                properties: {
                                    filePath: { type: "string" },
                                    fileType: { type: "string" },
                                    before: { type: "string" },
                                    after: { type: "string" }
                                },
                                required: ["filePath"]
                            }
                        },
                        checkpointRef: {
                            type: "string",
                            description: "Git ref or checkpoint ID"
                        },
                        changeDescription: {
                            type: "string",
                            description: "Optional summary of changes"
                        }
                    },
                    required: ["checkpointRef"]
                }
            },
            {
                name: "ask_bob",
                description: "Ask Bob for behavioral analysis of changes",
                inputSchema: {
                    type: "object",
                    properties: {
                        question: {
                            type: "string",
                            description: "Question to ask Bob"
                        },
                        context: {
                            type: "object",
                            properties: {
                                files: {
                                    type: "array",
                                    items: { type: "string" },
                                    description: "Relevant file paths"
                                },
                                changes: {
                                    type: "object",
                                    description: "Change details"
                                }
                            },
                            required: ["files", "changes"]
                        }
                    },
                    required: ["question", "context"]
                }
            },
            {
                name: "run_test",
                description: "Execute changed code with test inputs",
                inputSchema: {
                    type: "object",
                    properties: {
                        testInputs: {
                            type: "object",
                            description: "User-provided test data"
                        },
                        targetFiles: {
                            type: "array",
                            items: { type: "string" },
                            description: "Files to test"
                        },
                        checkpointRef: {
                            type: "string",
                            description: "Version to test"
                        }
                    },
                    required: ["testInputs", "targetFiles", "checkpointRef"]
                }
            }
        ]
    }));
    // Handle tools/call request
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        if (name === "notify_change") {
            const notifyResult = await notifyChangeHandler(args);
            // Auto-trigger Bob analysis after every change
            const notifyData = JSON.parse(notifyResult.content[0].text);
            if (notifyData.success && notifyData.changeId) {
                // Don't await — run analysis in background
                askBobHandler({
                    changes: notifyData.changes || [],
                    taskDescription: args.changeDescription || 'Code change',
                    changeId: notifyData.changeId
                }).then(result => {
                    const parsed = JSON.parse(result.content[0].text);
                    if (parsed.success) {
                        analysisCache.set(notifyData.changeId, {
                            before: parsed.flowGraph?.before || [],
                            after: parsed.flowGraph?.after || [],
                            edges_before: parsed.flowGraph?.edges_before || [],
                            edges_after: parsed.flowGraph?.edges_after || [],
                            summary: parsed.summary || '',
                            explanation: parsed.explanation || '',
                            risks: parsed.risks || [],
                            verdict: parsed.verdict || 'review',
                            tokens: typeof parsed.tokens === 'number' ? parsed.tokens : undefined,
                            cost: typeof parsed.cost === 'number' ? parsed.cost : undefined,
                            durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : undefined
                        });
                        console.error(`Analysis cached for ${notifyData.changeId}`);
                    }
                }).catch(err => {
                    console.error('Bob analysis failed:', err.message);
                });
            }
            return notifyResult;
        }
        if (name === "ask_bob") {
            const result = await askBobHandler(args);
            // Store analysis in cache if successful
            try {
                const parsed = JSON.parse(result.content[0].text);
                if (parsed.success && parsed.changeId) {
                    analysisCache.set(parsed.changeId, {
                        before: parsed.flowGraph?.before || [],
                        after: parsed.flowGraph?.after || [],
                        edges_before: parsed.flowGraph?.edges_before || [],
                        edges_after: parsed.flowGraph?.edges_after || [],
                        summary: parsed.summary || '',
                        explanation: parsed.explanation || '',
                        risks: parsed.risks || [],
                        verdict: parsed.verdict || 'review',
                        tokens: typeof parsed.tokens === 'number' ? parsed.tokens : undefined,
                        cost: typeof parsed.cost === 'number' ? parsed.cost : undefined,
                        durationMs: typeof parsed.durationMs === 'number' ? parsed.durationMs : undefined
                    });
                    console.error(`Cached analysis for changeId: ${parsed.changeId}`);
                }
            }
            catch (e) {
                console.error('Failed to cache Bob analysis:', e.message);
            }
            return result;
        }
        if (name === "run_test") {
            return await runTestHandler(args);
        }
        throw new Error(`Unknown tool: ${name}`);
    });
}
// Made with Bob
