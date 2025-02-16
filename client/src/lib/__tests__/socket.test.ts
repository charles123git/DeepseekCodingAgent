import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

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

  it('should create websocket with correct URL', () => {
    createWebSocket();
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:5000/ws');
  });

  it('should use wss protocol when on https', () => {
    global.location = {
      protocol: 'https:',
      host: 'localhost:5000',
    } as Location;

    createWebSocket();
    expect(WebSocket).toHaveBeenCalledWith('wss://localhost:5000/ws');
  });

  it('should implement connection timeout', () => {
    vi.useFakeTimers();
    const socket = createWebSocket();
    
    // Simulate connection timeout
    vi.advanceTimersByTime(5000);
    
    expect(mockWebSocket.close).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should clear timeout when connection is successful', () => {
    vi.useFakeTimers();
    const socket = createWebSocket();
    
    // Simulate successful connection
    mockWebSocket.onopen();
    
    // Advance time past timeout
    vi.advanceTimersByTime(5000);
    
    expect(mockWebSocket.close).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
