import axios from 'axios';
const SANDBOX_URL = process.env.SANDBOX_URL || 'http://localhost:3334';
export async function runTestHandler(args) {
    try {
        // Call sandbox service to execute the test
        const response = await axios.post(`${SANDBOX_URL}/execute`, {
            testInputs: args.testInputs,
            targetFiles: args.targetFiles,
            checkpointRef: args.checkpointRef,
            framework: 'react', // Default to React for MVP
        });
        const result = {
            success: true,
            executionResult: response.data.output,
            screenshot: response.data.screenshot,
        };
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        executionResult: null,
                        error: `Failed to run test: ${error.message}`,
                    }, null, 2),
                },
            ],
        };
    }
}
// Made with Bob
