import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Message } from "@shared/schema";
import { log } from "@/lib/utils";

export function useWebSocket() {
  const queryClient = useQueryClient();
  let socket: Socket | null = null;

  const connect = useCallback(() => {
    if (socket?.connected) return;

    socket = io(window.location.origin, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      log('WebSocket connected', { level: 'info' });
    });

    socket.on('message', (message: Message) => {
      // Update messages in the query cache
      queryClient.setQueryData(['messages'], (old: Message[] = []) => [...old, message]);
    });

    socket.on('error', (error: any) => {
      log('WebSocket error', { level: 'error', context: { error } });
    });

    socket.on('disconnect', (reason) => {
      log('WebSocket disconnected', { level: 'info', context: { reason } });
    });
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  }, []);

  const sendMessage = useCallback((message: Message) => {
    if (!socket?.connected) {
      throw new Error('WebSocket not connected');
    }
    socket.emit('message', message);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    sendMessage,
    reconnect: connect,
    disconnect,
  };
}
