import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { Server } from 'http';
import express from 'express';
import { registerRoutes } from '../../routes';

describe('WebSocket Server', () => {
  let server: Server;
  let wss: WebSocket;
  const port = 3001;
  const url = `ws://localhost:${port}/ws`;

  beforeEach(async () => {
    const app = express();
    server = await registerRoutes(app);
    server.listen(port);
  });

  afterEach(() => {
    if (wss) {
      wss.close();
    }
    server.close();
  });

  it('should establish WebSocket connection successfully', () => {
    return new Promise<void>((resolve) => {
      wss = new WebSocket(url);

      wss.on('open', () => {
        expect(wss.readyState).toBe(WebSocket.OPEN);
        resolve();
      });
    });
  });

  it('should broadcast messages to all connected clients', () => {
    return new Promise<void>((resolve) => {
      const ws1 = new WebSocket(url);
      const ws2 = new WebSocket(url);

      let connected = 0;
      const testMessage = {
        content: 'test message',
        role: 'user',
        metadata: {},
      };

      const onOpen = () => {
        connected++;
        if (connected === 2) {
          ws1.send(JSON.stringify(testMessage));
        }
      };

      ws1.on('open', onOpen);
      ws2.on('open', onOpen);

      ws2.on('message', (data) => {
        const received = JSON.parse(data.toString());
        expect(received.content).toBe(testMessage.content);
        expect(received.role).toBe(testMessage.role);
        resolve();
      });
    });
  });

  it('should reject invalid message format with error response', () => {
    return new Promise<void>((resolve) => {
      wss = new WebSocket(url);

      wss.on('open', () => {
        wss.send(JSON.stringify({ invalid: 'message' }));
      });

      wss.on('message', (data) => {
        const received = JSON.parse(data.toString());
        expect(received.metadata.error).toBe(true);
        resolve();
      });
    });
  });

  it('should handle connection closure gracefully', () => {
    return new Promise<void>((resolve) => {
      wss = new WebSocket(url);

      wss.on('open', () => {
        wss.close();
      });

      wss.on('close', () => {
        expect(wss.readyState).toBe(WebSocket.CLOSED);
        resolve();
      });
    });
  });
});