import { runInVM } from '../services/vm-runner.js';
import { captureScreenshot, renderComponentScreenshots } from '../services/screenshot.js';
import { runRequest } from '../services/request-runner.js';
export async function executeRoute(req, res) {
    try {
        const { code, testInputs, framework } = req.body;
        if (!code) {
            res.status(400).json({
                success: false,
                error: 'Code is required',
            });
            return;
        }
        const startTime = Date.now();
        // Execute code in VM
        const output = await runInVM(code, testInputs || {});
        // Capture screenshot if React component
        let screenshot = null;
        if (framework === 'react' && code.includes('React')) {
            screenshot = await captureScreenshot(code, testInputs || {});
        }
        const executionTime = Date.now() - startTime;
        const result = {
            success: true,
            output,
            screenshot,
            executionTime,
        };
        res.json(result);
    }
    catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            executionTime: 0,
        });
    }
}
// Made with Bob
export async function executeBackendRoute(req, res) {
    try {
        const input = req.body;
        // Validate required fields
        if (!input.method || !input.endpoint || !input.targetFile) {
            res.status(400).json({
                success: false,
                error: 'method, endpoint, and targetFile are required',
            });
            return;
        }
        // Set up Server-Sent Events headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();
        // Stream each step result
        for await (const stepResult of runRequest(input)) {
            res.write(`data: ${JSON.stringify(stepResult)}\n\n`);
        }
        // Send completion signal
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
    }
    catch (error) {
        console.error('Backend execution error:', error);
        // If headers not sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
        else {
            // If streaming already started, send error as SSE
            res.write(`data: ${JSON.stringify({
                error: error.message,
                done: true
            })}\n\n`);
            res.end();
        }
    }
}
export async function screenshotRoute(req, res) {
    try {
        const { beforeCode, afterCode, componentName } = req.body ?? {};
        if (!beforeCode || !afterCode) {
            res.status(400).json({ success: false, error: 'Missing required fields' });
            return;
        }
        const result = await renderComponentScreenshots(beforeCode || '', afterCode || '', componentName || 'Component');
        res.json({ success: true, ...result });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error?.message || 'Internal error',
            before: '',
            after: '',
        });
    }
}
//# sourceMappingURL=execute.js.map