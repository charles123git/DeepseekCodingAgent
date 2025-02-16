import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocket } from 'ws';
import { Server } from 'http';
import express from 'express';
import { registerRoutes } from '../routes';
import { insertMessageSchema } from '@shared/schema';

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

  afterEach((done) => {
    if (wss) {
      wss.close();
    }
    server.close(done);
  });

  it('should establish WebSocket connection', (done) => {
    wss = new WebSocket(url);
    
    wss.on('open', () => {
      expect(wss.readyState).toBe(WebSocket.OPEN);
      done();
    });
  });

  it('should broadcast messages to all clients', (done) => {
    const ws1 = new WebSocket(url);
    const ws2 = new WebSocket(url);
    
    let connected = 0;
    const message = {
      content: 'test message',
      role: 'user',
      metadata: {},
    };

    const onOpen = () => {
      connected++;
      if (connected === 2) {
        ws1.send(JSON.stringify(message));
      }
    };

    ws1.on('open', onOpen);
    ws2.on('open', onOpen);

    ws2.on('message', (data) => {
      const received = JSON.parse(data.toString());
      expect(received.content).toBe(message.content);
      expect(received.role).toBe(message.role);
      done();
    });
  });

  it('should validate message format', (done) => {
    wss = new WebSocket(url);
    
    wss.on('open', () => {
      wss.send(JSON.stringify({ invalid: 'message' }));
    });

    wss.on('message', (data) => {
      const received = JSON.parse(data.toString());
      expect(received.metadata.error).toBe(true);
      done();
    });
  });

  it('should handle connection closure gracefully', (done) => {
    wss = new WebSocket(url);
    
    wss.on('open', () => {
      wss.close();
    });

    wss.on('close', () => {
      expect(wss.readyState).toBe(WebSocket.CLOSED);
      done();
    });
  });
});
