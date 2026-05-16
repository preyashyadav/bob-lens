#!/usr/bin/env node
import * as dotenv from 'dotenv';
dotenv.config();
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupMCPTools } from './server.js';
import { startWebSocketServer } from './services/websocket.js';

async function main() {
  const server = new Server(
    {
      name: 'bob-lens',
      version: '0.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Setup MCP tools
  setupMCPTools(server);

  // Start WebSocket server for UI communication
  if (process.env.WEBSOCKET_ONLY === 'true') {
    await startWebSocketServer(server);
    console.error('Bob Lens WebSocket bridge running on port 8080');
    return;
  } else {
    await startWebSocketServer(server);
  }

  // Only one transport can be connected at a time. Default behavior:
  // - If we're spawned by a client (stdin is not a TTY), use STDIO.
  // - If we're run interactively, expose the SSE endpoint at http://localhost:8081/mcp.
  const shouldConnectStdio = process.env.MCP_TRANSPORT === 'stdio' || !process.stdin.isTTY;
  if (shouldConnectStdio) {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Bob Lens MCP Server running on STDIO');
  } else {
    const httpPort = process.env.HTTP_PORT || '8081';
    console.error(`Bob Lens MCP Server awaiting SSE connection on http://localhost:${httpPort}/mcp`);
  }

}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Made with Bob
