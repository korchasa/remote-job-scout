import { useEffect, useRef, useState } from "react";
import type { WebSocketMessage } from "../shared/schema.ts";

export function useWebSocket(sessionId?: string) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    // Create WebSocket connection
    const protocol = globalThis.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${globalThis.location.host}/ws`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);

      // Subscribe to session updates if sessionId provided
      if (sessionId && ws.current) {
        ws.current.send(JSON.stringify({
          type: "subscribe",
          sessionId,
        }));
      }
    };

    ws.current.onmessage = (event) => {
      try {
        const update = JSON.parse(event.data) as WebSocketMessage;
        setLastUpdate(update);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
    };

    ws.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    };

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [sessionId]);

  const sendMessage = (message: Record<string, unknown>) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return {
    isConnected,
    lastUpdate,
    sendMessage,
  };
}
