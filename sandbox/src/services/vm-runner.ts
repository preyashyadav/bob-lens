import ivm from 'isolated-vm';

const VM_TIMEOUT = parseInt(process.env.VM_TIMEOUT || '5000', 10);
const VM_MEMORY_LIMIT = 128; // MB

export async function runInVM(code: string, testInputs: any): Promise<any> {
  const logs: string[] = [];

  // Create isolated VM instance
  const isolate = new ivm.Isolate({ memoryLimit: VM_MEMORY_LIMIT });
  const context = await isolate.createContext();

  // Setup console logging
  const jail = context.global;
  await jail.set('global', jail.derefInto());

  // Inject testInputs
  await jail.set('testInputs', new ivm.ExternalCopy(testInputs).copyInto());

  // Create console object
  const consoleLog = new ivm.Reference((...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logs.push(message);
    console.log('[VM]', message);
  });

  const consoleError = new ivm.Reference((...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    logs.push(`ERROR: ${message}`);
    console.error('[VM]', message);
  });

  await jail.set('console', {
    log: consoleLog,
    error: consoleError,
  }, { copy: true });

  try {
    // Compile and run the code with timeout
    const script = await isolate.compileScript(code);
    const result = await script.run(context, { timeout: VM_TIMEOUT });

    // Get the result value
    const resultValue = typeof result === 'undefined' ? null : await result.copy();

    return {
      result: resultValue,
      logs,
    };
  } catch (error: any) {
    throw new Error(`VM execution failed: ${error.message}`);
  } finally {
    // Cleanup
    isolate.dispose();
  }
}

// Made with Bob
