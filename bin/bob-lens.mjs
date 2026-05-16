#!/usr/bin/env node

import { parseArgs } from 'node:util';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync, appendFileSync, readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const bobLensRoot = join(__dirname, '..');

const { positionals, values } = parseArgs({
  allowPositionals: true,
  strict: false,
  options: {
    force: {
      type: 'boolean',
      short: 'f',
      default: false,
    },
  },
});

const command = positionals[0];
const force = Boolean(values.force);

if (!command || !['init', 'start'].includes(command)) {
  console.error('Usage: bob-lens <init|start>');
  process.exit(1);
}

if (command === 'init') {
  console.log('🔍 Initializing Bob Lens...\n');

  // 1. Detect workspace path
  const workspacePath = process.cwd();
  console.log(`📁 Workspace: ${workspacePath}`);

  // 2. Detect bob binary path
  let bobPath;
  try {
    bobPath = execSync('which bob').toString().trim();
    console.log(`🤖 Bob Shell: ${bobPath}`);
  } catch (error) {
    console.error('\n❌ Bob Shell not found. Install from bob.ibm.com/download');
    process.exit(1);
  }

  // 3. Find bob-lens installation path
  console.log(`📦 Bob Lens: ${bobLensRoot}`);

  // 4. Create .bob/ directory if not exists
  const bobDir = join(workspacePath, '.bob');
  if (!existsSync(bobDir)) {
    mkdirSync(bobDir, { recursive: true });
    console.log('✓ Created .bob/ directory');
  }

  // 5. Write .bob/mcp.json
  const bobLensMcpPath = join(bobLensRoot, 'mcp-server/dist/index.js');

  const mcpConfig = {
    mcpServers: {
      'bob-lens': {
        command: 'node',
        args: [bobLensMcpPath],
        env: {
          WORKSPACE_PATH: workspacePath,
          BOB_PATH: bobPath,
          WEBSOCKET_PORT: '8082',
          HTTP_PORT: '8083',
          MAIN_HTTP_PORT: '8081'
        },
        alwaysAllow: ['notify_change', 'ask_bob', 'run_test']
      }
    }
  };

  const mcpJsonPath = join(bobDir, 'mcp.json');
  writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));
  console.log('✓ Created .bob/mcp.json');

  // 6. Append to .bobignore
  const bobignorePath = join(workspacePath, '.bobignore');
  const bobignoreContent = '\n.bob-lens/\nbob_sessions/\n';
  
  if (existsSync(bobignorePath)) {
    const existing = readFileSync(bobignorePath, 'utf-8');
    if (!existing.includes('.bob-lens/') || !existing.includes('bob_sessions/')) {
      appendFileSync(bobignorePath, bobignoreContent);
      console.log('✓ Updated .bobignore');
    }
  } else {
    writeFileSync(bobignorePath, bobignoreContent.trim() + '\n');
    console.log('✓ Created .bobignore');
  }

  // 7. Write AGENTS.md if not exists
  const agentsMdPath = join(workspacePath, 'AGENTS.md');
  if (!existsSync(agentsMdPath) || force) {
    const agentsContent = `# Bob Lens — Required Integration

## CRITICAL: After EVERY file change you MUST do this

Step 1: Switch to Advanced mode
Step 2: Immediately call the notify_change MCP tool
Step 3: Only then mark the task complete

## Parameters for notify_change:
- changedFiles: array of absolute paths of ALL files you modified
- checkpointRef: "HEAD"
- changeDescription: one sentence describing what changed

## THIS IS NOT OPTIONAL
## NEVER complete a task without calling notify_change
## NEVER skip this step for any reason
## If you forget, call it immediately before responding

## Example:
notify_change({
  changedFiles: ["/absolute/path/to/changed/file.js"],
  checkpointRef: "HEAD",
  changeDescription: "What you changed in one sentence"
})
`;
    writeFileSync(agentsMdPath, agentsContent);
    console.log(`${existsSync(agentsMdPath) ? '✓ Updated' : '✓ Created'} AGENTS.md`);
  }

  // 8. Create bob_sessions/ directory if not exists
  const sessionsDir = join(workspacePath, 'bob_sessions');
  if (!existsSync(sessionsDir)) {
    mkdirSync(sessionsDir, { recursive: true });
    console.log('✓ Created bob_sessions/ directory');
  }

  // 9. Print success message
  console.log('\n✅ Bob Lens initialized successfully!\n');
  console.log('Next steps:');
  console.log('1. Run: bob-lens start  (or: node /path/to/bob-lens/bin/bob-lens.mjs start)');
  console.log('2. Open http://localhost:3333 in your browser');
  console.log('3. Open this project in IBM Bob IDE');
  console.log('4. Go to Bob IDE → MCP settings → click Restart on bob-lens');
  console.log('   (Only needed once — auto-reconnects after that)');
  console.log('5. Enable MCP auto-approve in Bob IDE settings\n');
  console.log("That's it! Bob Lens will now visualize changes automatically.\n");

} else if (command === 'start') {
  // 1. Check if .bob/mcp.json exists
  const workspacePath = process.cwd();
  const mcpJsonPath = join(workspacePath, '.bob/mcp.json');
  
  if (!existsSync(mcpJsonPath)) {
    console.error('❌ Bob Lens not initialized. Run: bob-lens init');
    process.exit(1);
  }

  // 2. Get bobLensRoot
  const bobLensMcpPath = join(bobLensRoot, 'mcp-server/dist/index.js');
  const bobLensSandboxPath = join(bobLensRoot, 'sandbox/dist/index.js');
  const bobLensUiPath = join(bobLensRoot, 'ui');
  const viteBinPath = join(bobLensRoot, 'node_modules/.bin/vite');

  // 3. Spawn three processes concurrently
  const processes = [
    {
      name: 'UI',
      cmd: 'node',
      args: [viteBinPath, '--port', '3333', bobLensUiPath],
      env: { ...process.env }
    },
    {
      name: 'Sandbox',
      cmd: 'node',
      args: [bobLensSandboxPath],
      env: { ...process.env }
    }
  ];

  console.log('🔍 Bob Lens starting...\n');
  console.log('● UI            → http://localhost:3333');
  console.log('● Sandbox       → port 3334');
  console.log('● MCP Server    → started automatically by IBM Bob IDE\n');
  console.log('Open http://localhost:3333 in your browser.');
  console.log('Make changes with IBM Bob IDE to see them visualized.\n');
  console.log('Press Ctrl+C to stop.\n');

  processes.forEach(({ name, cmd, args, env }) => {
    const proc = spawn(cmd, args, { env, stdio: 'inherit' });
    proc.on('error', (err) => console.error(`${name} error:`, err.message));
  });

  // 4. Open browser automatically after 3 seconds
  setTimeout(() => {
    const open = process.platform === 'darwin' ? 'open' : 
                 process.platform === 'win32' ? 'start' : 'xdg-open';
    try {
      spawn(open, ['http://localhost:3333'], { detached: true, stdio: 'ignore' }).unref();
    } catch (err) {
      // Silently fail if browser can't be opened
    }
  }, 3000);
}

// Made with Bob
