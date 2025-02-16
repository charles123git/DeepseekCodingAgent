import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { Message, WebSocketMessage } from "@shared/schema";
import { log } from "@/lib/utils";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(window.location.origin, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false
    });

    socketRef.current.on('connect', () => {
      log('WebSocket connected', { level: 'info' });
    });

    socketRef.current.on('message', (message: Message) => {
      queryClient.setQueryData<Message[]>(['/api/messages'], (old = []) => {
        // Prevent duplicate messages by checking ID
        if (old.some(m => m.id === message.id)) {
          return old;
        }
        return [...old, message];
      });
    });

    socketRef.current.on('error', (error: any) => {
      log('WebSocket error', { level: 'error', context: { error } });
    });

    socketRef.current.on('disconnect', (reason) => {
      log('WebSocket disconnected', { level: 'info', context: { reason } });
      if (reason !== 'io client disconnect') {
        setTimeout(connect, 1000);
      }
    });

    socketRef.current.on('reconnect', (attemptNumber) => {
      log('WebSocket reconnected', { level: 'info', context: { attemptNumber } });
    });

    socketRef.current.on('reconnect_error', (error) => {
      log('WebSocket reconnection error', { level: 'error', context: { error } });
    });
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (message: Partial<WebSocketMessage>) => {
    if (!socketRef.current?.connected) {
      await new Promise<void>((resolve) => {
        if (socketRef.current?.connected) {
          resolve();
        } else {
          connect();
          socketRef.current?.once('connect', () => resolve());
        }
      });
    }

    socketRef.current?.emit('message', {
      ...message,
      timestamp: message.timestamp || new Date(),
      metadata: message.metadata || {},
      agentId: null,
      serviceId: null
    });
  }, [connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    sendMessage,
    reconnect: connect,
    disconnect,
    isConnected: socketRef.current?.connected ?? false
  };
}