import { WebSocketServer, WebSocket } from 'ws';
import * as http from 'http';
let wss;
// In-memory cache for analysis results
export const analysisCache = new Map();
export async function startWebSocketServer(mcpServer) {
    const initialPort = Number(process.env.WEBSOCKET_PORT || 8080);
    const attachWssHandlers = (server) => {
        server.on('connection', (ws) => {
            console.error('UI connected via WebSocket');
            ws.on('message', (message) => {
                console.error('Received from UI:', message.toString());
                // Handle messages from UI if needed
                try {
                    const data = JSON.parse(message.toString());
                    handleUIMessage(ws, data);
                }
                catch (error) {
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
    };
    const createWebSocketServer = (portNumber) => {
        const server = new WebSocketServer({ port: portNumber });
        server.on('listening', () => {
            console.error(`WebSocket server listening on port ${portNumber}`);
        });
        server.on('error', (err) => {
            if (err?.code === 'EADDRINUSE') {
                console.error(`Port ${portNumber} in use, waiting 2s before retry...`);
                setTimeout(() => {
                    try {
                        server.close();
                    }
                    catch {
                        // ignore
                    }
                    // Try the next port instead of crashing.
                    wss = createWebSocketServer(portNumber + 1);
                    attachWssHandlers(wss);
                }, 2000);
                return;
            }
            throw err;
        });
        attachWssHandlers(server);
        return server;
    };
    wss = createWebSocketServer(initialPort);
    // Start HTTP test server on port 8081
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
                            }).then((result) => {
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
                                }
                                catch (e) {
                                    console.error('Failed to parse Bob analysis:', e.message);
                                }
                            }).catch((err) => {
                                console.error('Bob analysis error:', err.message);
                            });
                        });
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, message: 'Broadcast sent' }));
                }
                catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
                }
            });
        }
        else if (req.method === 'GET' && req.url?.startsWith('/analysis/')) {
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
            }
            else {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: 'Analysis not found' }));
            }
        }
        else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });
    const httpPort = parseInt(process.env.HTTP_PORT || '8081', 10);
    httpServer.listen(httpPort, () => {
        console.error(`HTTP test server listening on port ${httpPort}`);
    });
}
function handleUIMessage(ws, data) {
    // Handle different message types from UI
    switch (data.type) {
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        default:
            console.error('Unknown message type from UI:', data.type);
    }
}
export function broadcastToUI(data) {
    if (!wss)
        return;
    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}
// Made with Bob
