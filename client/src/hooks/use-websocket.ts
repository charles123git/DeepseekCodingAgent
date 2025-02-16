import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { Message } from "@shared/schema";
import { log } from "@/lib/utils";

export function useWebSocket() {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    const socket = io(window.location.origin, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true
    });

    socket.on('connect', () => {
      log('WebSocket connected');
    });

    socket.on('message', (message: Message) => {
      queryClient.setQueryData<Message[]>(['/api/messages'], (old = []) => {
        if (!old.some(m => m.id === message.id)) {
          return [...old, message];
        }
        return old;
      });
    });

    socket.on('error', (error) => {
      log('WebSocket error', { context: { error } });
    });

    socket.on('disconnect', (reason) => {
      log('WebSocket disconnected', { context: { reason } });
    });

    socketRef.current = socket;
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (message: {
    content: string;
    role: "user";
    metadata?: Record<string, unknown>;
  }) => {
    if (!socketRef.current?.connected) {
      throw new Error('WebSocket not connected');
    }

    socketRef.current.emit('message', {
      ...message,
      timestamp: new Date(),
      metadata: message.metadata || {},
    });
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    sendMessage,
    isConnected: !!socketRef.current?.connected,
    reconnect: connect,
    disconnect
  };
}