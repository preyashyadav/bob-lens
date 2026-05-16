import { useEffect, useState } from 'react';
import { ChangeSet } from '../../../types/change';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [changeSets, setChangeSets] = useState<ChangeSet[]>([]);

  const clearChanges = () => {
    setChangeSets([]);
  };

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log('Connected to MCP server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received data:', data);
        
        if (data.type === 'change_notification') {
          setChangeSets((prev) => [...prev, data.data]);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log('Disconnected from MCP server');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { connected, changeSets, clearChanges };
}

// Made with Bob
