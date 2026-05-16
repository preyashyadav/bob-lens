import { spawn } from 'child_process';

export interface BobAnalysis {
  summary: string;
  flowGraph: {
    before: FlowNode[];
    after: FlowNode[];
    edges_before: Edge[];
    edges_after: Edge[];
  };
  explanation: string;
  risks: string[];
  verdict: 'safe' | 'review' | 'risky';
}

export interface FlowNode {
  id: string;
  label: string;
  file: string;
  line: number | null;
  type: 'component' | 'function' | 'route' | 'database' | 'return';
  status: 'unchanged' | 'new' | 'modified' | 'removed';
}

export interface Edge {
  from: string;
  to: string;
}

export async function runBobAnalysis(
  changes: Array<{filePath: string; fileType: string; before: string; after: string}>,
  taskDescription: string,
  workspacePath: string
): Promise<BobAnalysis> {
  // Build the prompt string
  const prompt = `Analyze these code changes in a Node.js/React project and return ONLY a JSON object.

Task: "${taskDescription}"

Changed files:
${changes.map(c => `
FILE: ${c.filePath} (${c.fileType})
BEFORE:
${c.before || '(new file)'}
AFTER:
${c.after || '(deleted)'}
`).join('\n---\n')}

Return ONLY this JSON, no other text:
{
  "summary": "one sentence what changed",
  "flowGraph": {
    "before": [{"id":"b1","label":"short label","file":"filename","line":5,"type":"function","status":"unchanged"}],
    "after": [{"id":"a1","label":"short label","file":"filename","line":5,"type":"function","status":"new"}],
    "edges_before": [{"from":"b1","to":"b2"}],
    "edges_after": [{"from":"a1","to":"a2"}]
  },
  "explanation": "2-3 sentences explaining the change impact",
  "risks": ["potential issue 1"],
  "verdict": "safe"
}

Node types: component, function, route, database, return
Status values: unchanged, new, modified, removed
Keep labels under 5 words. Trace full flow from UI to database.`;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      bobProcess.kill();
      reject(new Error('BobShell analysis timed out after 60 seconds'));
    }, 60000);

    // Spawn BobShell as a child process
    const bobProcess = spawn('bob', ['-p', prompt, '--output-format', 'stream-json'], {
      cwd: workspacePath,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';

    bobProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    bobProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    bobProcess.on('error', (error) => {
      clearTimeout(timeout);
      if (error.message.includes('ENOENT')) {
        reject(new Error('BobShell not found. Please install Bob Shell from bob.ibm.com/download'));
      } else {
        reject(error);
      }
    });

    bobProcess.on('close', (code) => {
      clearTimeout(timeout);

      if (code !== 0) {
        reject(new Error(`BobShell exited with code ${code}. Error: ${stderrData}`));
        return;
      }

      try {
        // Parse stdout lines to find tool_result
        const lines = stdoutData.split('\n').filter(line => line.trim());
        let analysisJson: string | null = null;

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'tool_result' && parsed.output) {
              analysisJson = parsed.output;
              break;
            }
          } catch {
            // Not a JSON line, continue
          }
        }

        if (!analysisJson) {
          reject(new Error('No tool_result found in BobShell output'));
          return;
        }

        // Strip markdown fences if present
        let cleanJson = analysisJson.trim();
        if (cleanJson.startsWith('```json')) {
          cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanJson.startsWith('```')) {
          cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        // Parse as BobAnalysis
        const analysis: BobAnalysis = JSON.parse(cleanJson);
        resolve(analysis);
      } catch (error) {
        reject(new Error(`Failed to parse BobShell output: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });
}

// Made with Bob
