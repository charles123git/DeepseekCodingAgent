import { describe, it, expect, vi } from 'vitest';
import { WebSocketManager } from '../socket';

// MVP Critical WebSocket Test
describe('WebSocket MVP Test', () => {
  const mockSocket = {
    readyState: 1,
    close: vi.fn(),
    send: vi.fn(),
    onopen: null,
    onmessage: null,
  };

  // Minimal test setup
  global.window = {
    location: { protocol: 'http:', host: 'localhost:5000' },
    setTimeout: vi.fn(cb => { cb(); return 1; }), // Execute immediately
    clearTimeout: vi.fn(),
  } as any;

  // Setup WebSocket mock
  global.WebSocket = vi.fn(() => mockSocket) as any;
  global.WebSocket.OPEN = 1;

  it('connects and handles messages for MVP', () => {
    const wsManager = new WebSocketManager({
      healthCheckInterval: 0 // Disable health checks for faster tests
    });

    const messageHandler = vi.fn();
    wsManager.on('message', messageHandler);
    wsManager.connect();

    // Verify basic connection
    expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:5000/ws');

    // Simulate successful connection
    mockSocket.onopen?.({});

    // Test message handling
    const msg = { type: 'test', content: 'MVP test' };
    mockSocket.onmessage?.({ data: JSON.stringify(msg) });
    expect(messageHandler).toHaveBeenCalledWith(msg);
  });
});