import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/dist/server/sse.js';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';

interface CachedAnalysis {
  before: any[];
  after: any[];
  edges_before: any[];
  edges_after: any[];
  summary: string;
  explanation: string;
  risks: string[];
  verdict: 'safe' | 'review' | 'risky';
}

let wss: WebSocketServer;

// In-memory cache for analysis results
export const analysisCache = new Map<string, CachedAnalysis>();

export async function startWebSocketServer(mcpServer: Server): Promise<void> {
  const port = process.env.WEBSOCKET_PORT || 8080;
  
  wss = new WebSocketServer({ port: Number(port) });

  wss.on('connection', (ws: WebSocket) => {
    console.error('UI connected via WebSocket');

    ws.on('message', (message: Buffer) => {
      console.error('Received from UI:', message.toString());
      
      // Handle messages from UI if needed
      try {
        const data = JSON.parse(message.toString());
        handleUIMessage(ws, data);
      } catch (error) {
        console.error('Failed to parse UI message:', error);
      }
    });

    ws.on('close', () => {
      console.error('UI disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  console.error(`WebSocket server listening on port ${port}`);

  // Start HTTP test server on port 8081
  let sseTransport: SSEServerTransport | null = null;

  const httpServer = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // MCP over SSE (GET establishes stream; POST sends messages using ?sessionId=...)
    // Bob IDE uses this to connect over HTTP without spawning a new MCP process.
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (url.pathname === '/mcp') {
        if (req.method === 'GET') {
          if (sseTransport) {
            res.writeHead(409, { 'Content-Type': 'text/plain' });
            res.end('MCP SSE transport already connected');
            return;
          }

          // Route requested by user:
          // if (req.url === '/mcp') {
          //   const transport = new SSEServerTransport('/mcp', res);
          //   await mcpServer.connect(transport);
          //   return;
          // }
          const transport = new SSEServerTransport('/mcp', res);
          sseTransport = transport;
          transport.onclose = () => {
            sseTransport = null;
          };

          await mcpServer.connect(transport);
          return;
        }

        if (req.method === 'POST') {
          if (!sseTransport) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('MCP SSE transport not connected');
            return;
          }
          const sessionId = url.searchParams.get('sessionId');
          if (!sessionId || sessionId !== sseTransport.sessionId) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid or missing sessionId');
            return;
          }

          await sseTransport.handlePostMessage(req, res);
          return;
        }

        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method not allowed');
        return;
      }
    } catch {
      // Fall through to other routes
    }

    if (req.method === 'POST' && req.url === '/trigger') {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          
          // Broadcast to UI
          broadcastToUI(data);
          
          // Auto-trigger Bob analysis if changes are present
          if (data.data?.changes && data.data?.id) {
            const changeId = data.data.id;
            const changes = data.data.changes;
            const taskDescription = data.data.description || 'Code change';
            
            // Import and call askBobHandler in background
            import('../tools/ask-bob.js').then(({ askBobHandler }) => {
              askBobHandler({
                changes,
                taskDescription,
                changeId
              } as any).then((result: any) => {
                try {
                  const parsed = JSON.parse(result.content[0].text);
                  if (parsed.success) {
                    analysisCache.set(changeId, {
                      before: parsed.flowGraph?.before || [],
                      after: parsed.flowGraph?.after || [],
                      edges_before: parsed.flowGraph?.edges_before || [],
                      edges_after: parsed.flowGraph?.edges_after || [],
                      summary: parsed.summary || '',
                      explanation: parsed.explanation || '',
                      risks: parsed.risks || [],
                      verdict: parsed.verdict || 'review'
                    });
                    console.error(`Bob analysis cached for changeId: ${changeId}`);
                  }
                } catch (e: any) {
                  console.error('Failed to parse Bob analysis:', e.message);
                }
              }).catch((err: any) => {
                console.error('Bob analysis error:', err.message);
              });
            });
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Broadcast sent' }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
    } else if (req.method === 'POST' && req.url === '/internal-broadcast') {
      let body = '';
      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          
          // Broadcast to UI clients
          // Mark as internal to prevent broadcastToUI from HTTP-forwarding back to this endpoint.
          broadcastToUI({ ...data, __bobLensInternalBroadcast: true });
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Broadcast forwarded' }));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
        }
      });
    } else if (req.method === 'GET' && req.url?.startsWith('/analysis/')) {
      // Extract changeId from URL
      const changeId = req.url.split('/analysis/')[1];
      
      if (!changeId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Missing changeId' }));
        return;
      }

      const analysis = analysisCache.get(changeId);
      
      if (analysis) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, analysis }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Analysis not found' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  httpServer.listen(8081, () => {
    console.error('HTTP test server listening on port 8081');
  });
}

function handleUIMessage(ws: WebSocket, data: any): void {
  // Handle different message types from UI
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    default:
      console.error('Unknown message type from UI:', data.type);
  }
}

export function broadcastToUI(data: any): void {
  const skipForward = Boolean(data && typeof data === 'object' && (data as any).__bobLensInternalBroadcast === true);
  if (skipForward && data && typeof data === 'object') {
    // Do not leak internal marker to UI clients.
    delete (data as any).__bobLensInternalBroadcast;
  }

  const message = JSON.stringify(data);

  // Try direct WebSocket broadcast first
  let clientCount = 0;
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
        clientCount++;
      }
    });
  }

  // If no clients connected, forward to main server via HTTP
  // (Skip forwarding when the call originated from /internal-broadcast to avoid loops.)
  if (!skipForward && clientCount === 0) {
    const httpPort = process.env.HTTP_PORT || '8081';
    fetch(`http://localhost:${httpPort}/internal-broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: message
    }).catch((err) => {
      console.error('Failed to forward broadcast:', err.message);
    });
  }
}

// Made with Bob
