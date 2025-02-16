import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createWebSocket } from '../socket';

describe('WebSocket Client', () => {
  let mockWebSocket: any;
  const originalWebSocket = global.WebSocket;
  const originalLocation = global.location;

  beforeEach(() => {
    mockWebSocket = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      readyState: WebSocket.CONNECTING,
    };

    // Mock WebSocket constructor
    global.WebSocket = vi.fn(() => mockWebSocket) as any;

    // Mock location object
    delete (global as any).location;
    global.location = {
      protocol: 'http:',
      host: 'localhost:5000',
    } as Location;
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    global.location = originalLocation;
  });

  it('should create websocket with correct ws:// URL when using HTTP', () => {
    createWebSocket();
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:5000/ws');
  });

  it('should create websocket with correct wss:// URL when using HTTPS', () => {
    global.location = {
      protocol: 'https:',
      host: 'localhost:5000',
    } as Location;

    createWebSocket();
    expect(WebSocket).toHaveBeenCalledWith('wss://localhost:5000/ws');
  });

  it('should close connection when timeout occurs before connection is established', () => {
    vi.useFakeTimers();
    createWebSocket();

    vi.advanceTimersByTime(5000);
    expect(mockWebSocket.close).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should not close connection when successfully connected within timeout period', () => {
    vi.useFakeTimers();
    createWebSocket();

    mockWebSocket.onopen();
    vi.advanceTimersByTime(5000);

    expect(mockWebSocket.close).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});