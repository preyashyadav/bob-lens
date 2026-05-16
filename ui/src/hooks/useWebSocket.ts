import { useEffect, useState } from 'react';
import { ChangeSet } from '../../../types/change';

export function useWebSocket() {
  const [connected, setConnected] = useState(false);
  const [changeSets, setChangeSets] = useState<ChangeSet[]>(() => {
    try {
      const saved = sessionStorage.getItem('bob-lens-changesets');
      return saved ? (JSON.parse(saved) as ChangeSet[]) : [];
    } catch {
      return [];
    }
  });

  const clearChanges = () => {
    setChangeSets([]);
    try {
      sessionStorage.removeItem('bob-lens-changesets');
    } catch {}
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('bob-lens-changesets', JSON.stringify(changeSets));
    } catch {}
  }, [changeSets]);

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
