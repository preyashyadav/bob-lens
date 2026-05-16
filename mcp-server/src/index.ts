#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupMCPTools } from './server.js';
import { startWebSocketServer } from './services/websocket.js';
import dotenv from 'dotenv';

dotenv.config();

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
  await startWebSocketServer();

  // Connect via STDIO
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Bob Lens MCP Server running on STDIO');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

// Made with Bob
