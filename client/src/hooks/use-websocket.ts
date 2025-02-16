import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@shared/schema";
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
    });

    socketRef.current.on('connect', () => {
      log('WebSocket connected', { level: 'info' });
    });

    socketRef.current.on('message', (message: Message) => {
      // Update messages in the query cache
      queryClient.setQueryData(['messages'], (old: Message[] = []) => [...old, message]);
    });

    socketRef.current.on('error', (error: any) => {
      log('WebSocket error', { level: 'error', context: { error } });
    });

    socketRef.current.on('disconnect', (reason) => {
      log('WebSocket disconnected', { level: 'info', context: { reason } });
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

  const sendMessage = useCallback((message: Message) => {
    if (!socketRef.current?.connected) {
      throw new Error('WebSocket not connected');
    }
    socketRef.current.emit('message', message);
  }, []);

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