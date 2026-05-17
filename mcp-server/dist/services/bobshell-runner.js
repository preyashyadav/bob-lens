import * as dotenv from 'dotenv';
dotenv.config();
import { spawn } from 'child_process';
export async function runBobAnalysis(changes, taskDescription, workspacePath) {
    try {
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

For EVERY node, you MUST also provide these three fields:

"input": What data or values does this node receive as input? Be specific.
  - For functions: parameter names and types, e.g. "sum: number, constant: number = 10"
  - For routes: HTTP method and request shape, e.g. "POST /login { email: string, password: string }"
  - For database nodes: query type and parameters, e.g. "SELECT WHERE id = :userId"
  - For components: props, e.g. "{ name: string, role: string, verified?: boolean }"
  - If unchanged from previous node's output, say "receives output from [previous node label]"

"output": What does this node return or pass to the next node?
  - For functions: return type and example value, e.g. "number (e.g. 225, the squared result)"
  - For routes: response shape, e.g. "{ success: true, token: 'jwt_string' }"
  - For database nodes: what data comes back, e.g. "User record or null"
  - For components: rendered JSX description, e.g. "Card div with title, subtitle, delete button"

"description": One plain English sentence of exactly what this node does.
  - Be specific about the operation, not generic.
  - BAD: "processes the data"
  - GOOD: "subtracts constant 10 from the sum and passes result to exponent function"
  - BAD: "handles the request"
  - GOOD: "validates JWT token from Authorization header, returns 401 if invalid or expired"

For backward edges (when a function calls a previous function, e.g. recursion):
  Include in edges_before/edges_after normally. Example: {"from": "a4", "to": "a1"} means a4 calls back to a1.
  This happens in loops, recursion, or retry logic.

IMPORTANT: Do not leave input/output/description empty. Every node must have all three.

Node types: component, function, route, database, return
Status values: unchanged, new, modified, removed
Keep labels under 5 words. Trace full flow from UI to database.`;
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                bobProcess.kill();
                reject(new Error('BobShell analysis timed out after 60 seconds'));
            }, 60000);
            // Spawn BobShell as a child process
            const BOB_PATH = process.env.BOB_PATH || '/Users/preyashyadav/.nvm/versions/node/v22.20.0/bin/bob';
            const bobProcess = spawn(BOB_PATH, ['-p', prompt, '--output-format', 'stream-json'], {
                cwd: workspacePath,
                env: {
                    ...process.env,
                    PATH: `${process.env.PATH}:/Users/preyashyadav/.nvm/versions/node/v22.20.0/bin:/usr/local/bin:/opt/homebrew/bin`
                },
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: false
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
                }
                else {
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
                    let analysisJson = null;
                    let totalTokens;
                    let sessionCost;
                    let durationMs;
                    for (const line of lines) {
                        try {
                            const parsed = JSON.parse(line);
                            // BobShell emits a final JSON line where type === 'result' containing stats.
                            if (parsed?.type === 'result') {
                                const stats = parsed?.stats ??
                                    parsed?.data?.stats ??
                                    parsed?.result?.stats ??
                                    parsed?.output?.stats;
                                if (stats) {
                                    const maybeTokens = Number(stats.total_tokens);
                                    const maybeCost = Number(stats.session_costs);
                                    const maybeDuration = Number(stats.duration_ms);
                                    if (Number.isFinite(maybeTokens))
                                        totalTokens = maybeTokens;
                                    if (Number.isFinite(maybeCost))
                                        sessionCost = maybeCost;
                                    if (Number.isFinite(maybeDuration))
                                        durationMs = maybeDuration;
                                }
                            }
                            if (parsed.type === 'tool_result' && parsed.output) {
                                analysisJson = parsed.output;
                                break;
                            }
                        }
                        catch {
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
                    }
                    else if (cleanJson.startsWith('```')) {
                        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }
                    // Parse as BobAnalysis
                    const analysis = JSON.parse(cleanJson);
                    analysis.tokens = totalTokens;
                    analysis.cost = sessionCost;
                    analysis.durationMs = durationMs;
                    resolve(analysis);
                }
                catch (error) {
                    reject(new Error(`Failed to parse BobShell output: ${error instanceof Error ? error.message : String(error)}`));
                }
            });
        });
    }
    catch (error) {
        console.error('BobShell analysis failed:', error.message);
        return {
            summary: 'Analysis unavailable',
            flowGraph: { before: [], after: [], edges_before: [], edges_after: [] },
            explanation: error.message,
            risks: [],
            verdict: 'review'
        };
    }
}
// Made with Bob
