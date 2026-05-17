import { runBobAnalysis, BobAnalysis } from '../services/bobshell-runner.js';

interface AskBobArgs {
  changes: Array<{
    filePath: string;
    fileType: string;
    before: string;
    after: string;
  }>;
  taskDescription: string;
  changeId?: string;
}

export async function askBobHandler(args: AskBobArgs): Promise<{ content: Array<{ type: string; text: string }>; analysis?: BobAnalysis; changeId?: string }> {
  try {
    // Get workspace path from environment or use current directory
    const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

    // Run Bob analysis
    const analysis = await runBobAnalysis(args.changes, args.taskDescription, workspacePath);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          changeId: args.changeId,
          flowGraph: analysis.flowGraph,
          summary: analysis.summary,
          explanation: analysis.explanation,
          risks: analysis.risks,
          verdict: analysis.verdict,
          tokens: analysis.tokens,
          cost: analysis.cost,
          durationMs: analysis.durationMs
        })
      }],
      analysis,
      changeId: args.changeId
    };
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Failed to ask Bob: ${error.message}`,
          }, null, 2),
        },
      ],
    };
  }
}

// Made with Bob
