import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { Message } from "@shared/schema";
import { log } from "@/lib/utils";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      log('WebSocket connected', { level: 'info' });
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        // Update messages in the query cache
        queryClient.setQueryData(['messages'], (old: Message[] = []) => [...old, message]);
      } catch (error) {
        log('Failed to parse WebSocket message', { 
          level: 'error', 
          context: { error, data: event.data } 
        });
      }
    };

    wsRef.current.onerror = (error) => {
      log('WebSocket error', { level: 'error', context: { error } });
    };

    wsRef.current.onclose = () => {
      log('WebSocket disconnected', { level: 'info' });
      // Attempt to reconnect after a delay
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendMessage = useCallback((message: Message) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }
    wsRef.current.send(JSON.stringify(message));
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    sendMessage,
    reconnect: connect,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}