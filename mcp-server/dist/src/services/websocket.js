import { WebSocketServer, WebSocket } from 'ws';
let wss;
export async function startWebSocketServer() {
    const port = process.env.WEBSOCKET_PORT || 8080;
    wss = new WebSocketServer({ port: Number(port) });
    wss.on('connection', (ws) => {
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
    console.error(`WebSocket server listening on port ${port}`);
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
