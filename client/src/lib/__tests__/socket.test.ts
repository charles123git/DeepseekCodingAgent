import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWebSocket, WebSocketManager } from '../socket';
import { EventEmitter } from 'events';

// Mock WebSocket class that implements all required methods and event handlers
class MockWebSocket implements Partial<WebSocket> {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  private eventHandlers: Record<string, ((event: any) => void)[]> = {
    open: [],
    close: [],
    message: [],
    error: []
  };

  constructor(public url: string) {}

  addEventListener(event: string, handler: (event: any) => void): void {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = [];
    }
    this.eventHandlers[event].push(handler);
  }

  removeEventListener(event: string, handler: (event: any) => void): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event] = this.eventHandlers[event].filter(h => h !== handler);
    }
  }

  dispatchEvent(event: string, data?: any): void {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data));
    }
  }

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.dispatchEvent('close', { code: 1000, reason: 'Normal closure' });
  });

  send = vi.fn((data: string) => {
    if (this.readyState === MockWebSocket.OPEN) {
      this.dispatchEvent('message', { data });
    }
  });

  // Event handler setters
  set onopen(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('open', handler);
    }
  }

  set onclose(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('close', handler);
    }
  }

  set onmessage(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('message', handler);
    }
  }

  set onerror(handler: ((event: any) => void) | null) {
    if (handler) {
      this.addEventListener('error', handler);
    }
  }
}

describe('WebSocket Client', () => {
  let mockWebSocket: MockWebSocket;
  let wsManager: WebSocketManager;
  const originalWebSocket = global.WebSocket;
  const originalLocation = global.location;

  beforeEach(() => {
    delete (global as any).location;
    global.location = {
      protocol: 'http:',
      host: 'localhost:5000',
    } as Location;

    // Create a new mock instance for each test
    mockWebSocket = new MockWebSocket('ws://localhost:5000/ws');
    global.WebSocket = vi.fn(() => mockWebSocket) as any;
    wsManager = new WebSocketManager();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    global.location = originalLocation;
    vi.clearAllMocks();
    wsManager.cleanup();
  });

  describe('Connection Management', () => {
    it('should create websocket with correct ws:// URL when using HTTP', () => {
      wsManager.connect();
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:5000/ws');
    });

    it('should create websocket with correct wss:// URL when using HTTPS', () => {
      global.location = {
        protocol: 'https:',
        host: 'localhost:5000',
      } as Location;

      wsManager.connect();
      expect(WebSocket).toHaveBeenCalledWith('wss://localhost:5000/ws');
    });

    it('should not create new connection if already connected', () => {
      mockWebSocket.readyState = MockWebSocket.OPEN;
      wsManager.connect();
      wsManager.connect();
      expect(WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should handle connection timeout', () => {
      vi.useFakeTimers();
      wsManager.connect();
      vi.advanceTimersByTime(5000);
      expect(mockWebSocket.close).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('should implement health check mechanism', () => {
      vi.useFakeTimers();
      mockWebSocket.readyState = MockWebSocket.OPEN;
      wsManager.connect();

      vi.advanceTimersByTime(30000);
      expect(mockWebSocket.send).toHaveBeenCalledWith('ping');

      // Simulate missed pongs
      vi.advanceTimersByTime(60000);
      expect(mockWebSocket.close).toHaveBeenCalled();
      vi.useRealTimers();
    });
  });

  describe('Message Handling', () => {
    it('should emit parsed messages to subscribers', () => {
      const messageHandler = vi.fn();
      wsManager.on('message', messageHandler);
      wsManager.connect();

      // Simulate connection and message
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.dispatchEvent('open');

      const testMessage = { type: 'test', content: 'hello' };
      mockWebSocket.dispatchEvent('message', { data: JSON.stringify(testMessage) });

      expect(messageHandler).toHaveBeenCalledWith(testMessage);
    });

    it('should handle invalid JSON messages', () => {
      const messageHandler = vi.fn();
      wsManager.on('message', messageHandler);
      wsManager.connect();

      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.dispatchEvent('open');
      mockWebSocket.dispatchEvent('message', { data: 'invalid json' });

      expect(messageHandler).not.toHaveBeenCalled();
    });

    it('should queue messages when disconnected', () => {
      wsManager.connect();
      mockWebSocket.readyState = MockWebSocket.CONNECTING;

      wsManager.send('test message');
      expect(mockWebSocket.send).not.toHaveBeenCalled();

      // Simulate connection success
      mockWebSocket.readyState = MockWebSocket.OPEN;
      mockWebSocket.dispatchEvent('open');

      expect(mockWebSocket.send).toHaveBeenCalledWith('test message');
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors with circuit breaker', () => {
      wsManager.connect();
      mockWebSocket.dispatchEvent('error', new Error('Connection failed'));

      // Verify circuit breaker prevents immediate reconnection
      wsManager.connect();
      expect(WebSocket).toHaveBeenCalledTimes(1);
    });

    it('should implement exponential backoff for reconnection', () => {
      vi.useFakeTimers();
      wsManager.connect();

      // Simulate multiple connection failures
      for (let i = 0; i < 3; i++) {
        mockWebSocket.dispatchEvent('close', { code: 1006, reason: 'Connection failed' });
        vi.advanceTimersByTime(1000 * Math.pow(2, i));
        expect(WebSocket).toHaveBeenCalledTimes(i + 2);
      }

      vi.useRealTimers();
    });

    it('should emit state changes on connection events', () => {
      const stateHandler = vi.fn();
      wsManager.on('stateChange', stateHandler);
      wsManager.connect();

      mockWebSocket.dispatchEvent('open');
      expect(stateHandler).toHaveBeenCalledWith('connected');

      mockWebSocket.dispatchEvent('close', { code: 1006, reason: 'Connection failed' });
      expect(stateHandler).toHaveBeenCalledWith('disconnected');
    });

    it('should cleanup resources on disconnect', () => {
      vi.useFakeTimers();
      wsManager.connect();
      wsManager.cleanup();

      expect(mockWebSocket.close).toHaveBeenCalled();
      vi.advanceTimersByTime(30000);
      expect(mockWebSocket.send).not.toHaveBeenCalled(); // Health check should not run
      vi.useRealTimers();
    });
  });
});