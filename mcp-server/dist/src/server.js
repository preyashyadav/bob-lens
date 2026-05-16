import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/dist/types.js";
import { notifyChangeHandler } from './tools/notify-change.js';
import { askBobHandler } from './tools/ask-bob.js';
import { runTestHandler } from './tools/run-test.js';
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
                        checkpointRef: {
                            type: "string",
                            description: "Git ref or checkpoint ID"
                        },
                        changeDescription: {
                            type: "string",
                            description: "Optional summary of changes"
                        }
                    },
                    required: ["changedFiles", "checkpointRef"]
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
            return await notifyChangeHandler(args);
        }
        if (name === "ask_bob") {
            return await askBobHandler(args);
        }
        if (name === "run_test") {
            return await runTestHandler(args);
        }
        throw new Error(`Unknown tool: ${name}`);
    });
}
// Made with Bob
