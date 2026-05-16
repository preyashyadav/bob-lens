import { Request, Response } from 'express';
import { runInVM } from '../services/vm-runner.js';
import { captureScreenshot } from '../services/screenshot.js';

interface ExecutionRequest {
  code: string;
  testInputs: Record<string, any>;
  framework: 'react' | 'node';
}

interface ExecutionResult {
  success: boolean;
  output?: any;
  screenshot?: string | null;
  executionTime: number;
}

export async function executeRoute(req: Request, res: Response): Promise<void> {
  try {
    const { code, testInputs, framework } = req.body as ExecutionRequest;

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
    let screenshot: string | null = null;
    if (framework === 'react' && code.includes('React')) {
      screenshot = await captureScreenshot(code, testInputs || {});
    }

    const executionTime = Date.now() - startTime;

    const result: ExecutionResult = {
      success: true,
      output,
      screenshot,
      executionTime,
    };

    res.json(result);
  } catch (error: any) {
    console.error('Execution error:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      executionTime: 0,
    });
  }
}

// Made with Bob
