import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';

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

export async function startWebSocketServer(): Promise<void> {
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
  const httpServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
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
  if (!wss) {
    console.error('WebSocket server not initialized');
    return;
  }

  const message = JSON.stringify(data);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Made with Bob
