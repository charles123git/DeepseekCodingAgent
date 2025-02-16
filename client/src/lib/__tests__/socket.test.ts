import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SocketManager } from '../socket';
import type { Message } from '@shared/schema';
import { io } from 'socket.io-client';

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    on: vi.fn(),
    connected: false,
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
  })),
}));

describe('Socket Manager Tests', () => {
  let socketManager: SocketManager;
  let mockSocket: any;
  let eventHandlers: Record<string, Function[]> = {};

  beforeEach(() => {
    // Reset event handlers
    eventHandlers = {
      connect: [],
      disconnect: [],
      message: [],
      connect_error: [],
    };

    // Setup mock socket
    mockSocket = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event: string, handler: Function) => {
        eventHandlers[event] = eventHandlers[event] || [];
        eventHandlers[event].push(handler);
      }),
      connected: false,
      removeListener: vi.fn(),
      removeAllListeners: vi.fn(),
    };

    (io as any).mockImplementation(() => mockSocket);

    socketManager = new SocketManager();
    socketManager.connect();
  });

  afterEach(() => {
    socketManager.cleanup();
    vi.clearAllMocks();
  });

  // Connection Management Tests
  describe('Connection Management', () => {
    it('should initialize connection with correct configuration', () => {
      expect(io).toHaveBeenCalledWith(expect.objectContaining({
        path: '/ws',
        reconnectionAttempts: expect.any(Number),
        reconnectionDelay: expect.any(Number),
      }));
    });

    it('should handle connection success correctly', () => {
      mockSocket.connected = true;
      eventHandlers.connect[0]?.();
      expect(socketManager.getState()).toBe('connected');
    });

    it('should handle connection errors gracefully', () => {
      eventHandlers.connect_error[0]?.(new Error('Connection failed'));
      expect(socketManager.getState()).toBe('disconnected');
    });
  });

  // Message Handling Tests
  describe('Message Handling', () => {
    it('should send messages correctly when connected', () => {
      mockSocket.connected = true;
      const message: Message = {
        content: 'test message',
        role: 'user',
        metadata: {},
      };

      socketManager.send(JSON.stringify(message));
      expect(mockSocket.emit).toHaveBeenCalledWith('message', message);
    });

    it('should not send messages when disconnected', () => {
      mockSocket.connected = false;
      const message: Message = {
        content: 'test message',
        role: 'user',
        metadata: {},
      };

      socketManager.send(JSON.stringify(message));
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it('should handle incoming messages correctly', () => {
      const messageHandler = vi.fn();
      socketManager.on('message', messageHandler);

      const testMessage: Message = {
        content: 'test response',
        role: 'assistant',
        metadata: {},
      };

      eventHandlers.message[0]?.(testMessage);
      expect(messageHandler).toHaveBeenCalledWith(testMessage);
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle reconnection on disconnect', () => {
      mockSocket.connected = true;
      eventHandlers.connect[0]?.();
      expect(socketManager.getState()).toBe('connected');

      eventHandlers.disconnect[0]?.('io server disconnect');
      expect(socketManager.getState()).toBe('disconnected');
    });

    it('should cleanup resources properly', () => {
      socketManager.cleanup();
      expect(mockSocket.disconnect).toHaveBeenCalled();
      expect(socketManager.getState()).toBe('disconnected');
    });
  });
});