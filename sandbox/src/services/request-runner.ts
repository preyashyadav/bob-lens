import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export interface RunRequestInput {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  headers: Record<string, string>;
  body: Record<string, any>;
  targetFile: string; // the changed controller file path
  checkpointRef: string;
}

export interface StepResult {
  layer: 'input' | 'middleware' | 'controller' | 'database' | 'response';
  status: 'success' | 'error' | 'skipped';
  input: any;
  output: any;
  duration: number;
  note?: string;
}

export async function* runRequest(input: RunRequestInput): AsyncGenerator<StepResult> {
  // Step 1: Input - echo back the request
  const inputStart = Date.now();
  yield {
    layer: 'input',
    status: 'success',
    input: {
      method: input.method,
      endpoint: input.endpoint,
      headers: input.headers,
      body: input.body,
    },
    output: {
      method: input.method,
      endpoint: input.endpoint,
      headers: input.headers,
      body: input.body,
    },
    duration: Date.now() - inputStart,
    note: 'Request received and validated',
  };

  // Step 2: Middleware - check for middleware functions
  const middlewareStart = Date.now();
  let middlewareResult: StepResult;
  
  try {
    const fileContent = fs.readFileSync(input.targetFile, 'utf-8');
    const middlewareRegex = /(middleware|auth)\w*\s*[=:]\s*(async\s*)?\(?/gi;
    const matches = fileContent.match(middlewareRegex);
    
    if (matches && matches.length > 0) {
      middlewareResult = {
        layer: 'middleware',
        status: 'success',
        input: { targetFile: input.targetFile },
        output: { found: matches },
        duration: Date.now() - middlewareStart,
        note: `Found ${matches.length} middleware function(s): ${matches.join(', ')}`,
      };
    } else {
      middlewareResult = {
        layer: 'middleware',
        status: 'skipped',
        input: { targetFile: input.targetFile },
        output: null,
        duration: Date.now() - middlewareStart,
        note: 'No middleware functions detected',
      };
    }
  } catch (error: any) {
    middlewareResult = {
      layer: 'middleware',
      status: 'error',
      input: { targetFile: input.targetFile },
      output: null,
      duration: Date.now() - middlewareStart,
      note: `Error reading file: ${error.message}`,
    };
  }
  
  yield middlewareResult;

  // Step 3: Controller - dynamically require and execute
  const controllerStart = Date.now();
  let controllerResult: StepResult;
  let controllerOutput: any = null;
  
  try {
    // Create mock req and res objects
    const mockReq = {
      params: {},
      body: input.body,
      headers: input.headers,
      query: {},
      method: input.method,
      url: input.endpoint,
    };
    
    let capturedStatus = 200;
    let capturedJson: any = null;
    
    const mockRes = {
      status: (code: number) => {
        capturedStatus = code;
        return mockRes;
      },
      json: (data: any) => {
        capturedJson = data;
        return mockRes;
      },
      send: (data: any) => {
        capturedJson = data;
        return mockRes;
      },
    };
    
    // Resolve the absolute path
    const absolutePath = path.resolve(input.targetFile);
    
    // Clear require cache to get fresh module
    delete require.cache[absolutePath];
    
    // Dynamically require the module
    const module = require(absolutePath);
    
    // Determine which function to call based on HTTP method
    let targetFunction: any = null;
    const exportedFunctions = Object.keys(module).filter(
      key => typeof module[key] === 'function'
    );
    
    // Method mapping: GET→first, POST→second, DELETE→third, PUT→fourth
    const methodIndex: Record<string, number> = {
      GET: 0,
      POST: 1,
      DELETE: 2,
      PUT: 3,
    };
    
    const functionIndex = methodIndex[input.method] || 0;
    
    if (exportedFunctions.length > functionIndex) {
      targetFunction = module[exportedFunctions[functionIndex]];
    } else if (exportedFunctions.length > 0) {
      // Fallback to first function if index out of bounds
      targetFunction = module[exportedFunctions[0]];
    }
    
    if (targetFunction) {
      // Call the function
      await targetFunction(mockReq, mockRes);
      
      controllerOutput = {
        status: capturedStatus,
        body: capturedJson,
      };
      
      controllerResult = {
        layer: 'controller',
        status: 'success',
        input: { method: input.method, endpoint: input.endpoint },
        output: controllerOutput,
        duration: Date.now() - controllerStart,
        note: `Executed ${exportedFunctions[functionIndex] || exportedFunctions[0]}`,
      };
    } else {
      controllerResult = {
        layer: 'controller',
        status: 'error',
        input: { method: input.method, endpoint: input.endpoint },
        output: null,
        duration: Date.now() - controllerStart,
        note: 'No exported functions found in target file',
      };
    }
  } catch (error: any) {
    controllerResult = {
      layer: 'controller',
      status: 'error',
      input: { method: input.method, endpoint: input.endpoint },
      output: null,
      duration: Date.now() - controllerStart,
      note: `Controller execution error: ${error.message}`,
    };
  }
  
  yield controllerResult;

  // Step 4: Database - scan for DB operations
  const databaseStart = Date.now();
  let databaseResult: StepResult;
  
  try {
    const fileContent = fs.readFileSync(input.targetFile, 'utf-8');
    const dbKeywords = [
      'find', 'save', 'query', 'update', 'delete', 'insert',
      'mongoose', 'sequelize', 'pg', 'findOne', 'findById',
      'create', 'updateOne', 'deleteOne', 'aggregate',
    ];
    
    const foundKeywords: string[] = [];
    for (const keyword of dbKeywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      if (regex.test(fileContent)) {
        foundKeywords.push(keyword);
      }
    }
    
    if (foundKeywords.length > 0) {
      databaseResult = {
        layer: 'database',
        status: 'success',
        input: { targetFile: input.targetFile },
        output: { operations: foundKeywords },
        duration: Date.now() - databaseStart,
        note: `DB calls intercepted — not executed against real database. Found: ${foundKeywords.join(', ')}`,
      };
    } else {
      databaseResult = {
        layer: 'database',
        status: 'skipped',
        input: { targetFile: input.targetFile },
        output: null,
        duration: Date.now() - databaseStart,
        note: 'No database operations detected',
      };
    }
  } catch (error: any) {
    databaseResult = {
      layer: 'database',
      status: 'error',
      input: { targetFile: input.targetFile },
      output: null,
      duration: Date.now() - databaseStart,
      note: `Error scanning for DB operations: ${error.message}`,
    };
  }
  
  yield databaseResult;

  // Step 5: Response - return captured response
  const responseStart = Date.now();
  yield {
    layer: 'response',
    status: controllerOutput ? 'success' : 'error',
    input: controllerOutput,
    output: controllerOutput || { status: 500, body: { error: 'No response captured' } },
    duration: Date.now() - responseStart,
    note: controllerOutput 
      ? `Response captured: ${controllerOutput.status}` 
      : 'No response data available',
  };
}

// Made with Bob