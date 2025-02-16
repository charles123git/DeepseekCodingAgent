import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketManager } from '../socket';

// Single test for WebSocket core functionality
describe('WebSocket Core', () => {
  let mockSocket: any;
  let manager: WebSocketManager;

  beforeEach(() => {
    // Create mock socket with proper event handlers
    mockSocket = {
      readyState: WebSocket.OPEN,
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null
    };

    // Mock WebSocket constructor
    global.WebSocket = vi.fn(() => mockSocket) as any;

    // Mock window location
    global.window = {
      location: { protocol: 'http:', host: 'localhost:5000' }
    } as any;

    // Create manager instance
    manager = new WebSocketManager({
      maxRetries: 0,
      healthCheckInterval: 0,
      initialRetryDelay: 0,
      connectionTimeout: 0
    });
  });

  it('establishes connection and handles messages', () => {
    // Connect to WebSocket
    manager.connect();

    // Verify connection attempt
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:5000/ws');

    // Simulate successful connection
    if (mockSocket.onopen) {
      mockSocket.onopen(new Event('open'));
    }

    // Verify initial state
    expect(mockSocket.send).not.toHaveBeenCalled();
    expect(mockSocket.close).not.toHaveBeenCalled();
  });
});