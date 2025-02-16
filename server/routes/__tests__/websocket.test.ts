import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { io as ioc } from "socket.io-client";
import express from 'express';
import { Server } from 'http';
import { registerRoutes } from '../../routes';
import { InsertMessage, Message } from '@shared/schema';
import { storage } from '../../storage';
import { AgentManager } from '../../agents/agent';

// Mock storage and AgentManager
vi.mock('../../storage', () => ({
  storage: {
    addMessage: vi.fn(async (message) => ({
      ...message,
      id: 1,
      timestamp: new Date().toISOString(),
    })),
    getMessages: vi.fn(async () => []),
  },
}));

vi.mock('../../agents/agent', () => ({
  AgentManager: vi.fn(() => ({
    handleMessage: vi.fn(async (message: Message) => ({
      content: 'Mock AI response',
      role: 'assistant',
      metadata: {},
    })),
  })),
}));

describe('Socket.IO Server', () => {
  let server: Server;
  let clientSocket: any;
  let port: number;

  beforeEach(async () => {
    const app = express();
    server = await registerRoutes(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      });
    });

    clientSocket = ioc(`http://localhost:${port}`, {
      path: "/ws",
      reconnectionDelay: 0,
      forceNew: true,
    });

    await new Promise((resolve) => {
      clientSocket.on("connect", resolve);
    });

    // Reset mocks
    vi.mocked(storage.addMessage).mockClear();
    vi.mocked(AgentManager).mockClear();
  });

  afterEach(() => {
    clientSocket.close();
    server.close();
  });

  // Message Handling Tests
  describe('Message Handling', () => {
    it('should validate and process correctly formatted messages', () => {
      return new Promise<void>((resolve) => {
        const validMessage: InsertMessage = {
          content: 'test message',
          role: 'user',
          metadata: {},
        };

        let messageCount = 0;
        clientSocket.on('message', (data: any) => {
          messageCount++;
          if (messageCount === 1) {
            expect(data.content).toBe(validMessage.content);
            expect(data.role).toBe('user');
          } else if (messageCount === 2) {
            expect(data.content).toBe('Mock AI response');
            expect(data.role).toBe('assistant');
            resolve();
          }
        });

        clientSocket.emit('message', validMessage);
      });
    });

    it('should reject invalid message format with error response', () => {
      return new Promise<void>((resolve) => {
        clientSocket.on('message', (data: any) => {
          if (data.role === 'system' && data.metadata.error) {
            expect(data.metadata.validationError).toBeDefined();
            resolve();
          }
        });

        clientSocket.emit('message', { invalid: 'message' });
      });
    });

    it('should broadcast messages to all connected clients', () => {
      return new Promise<void>((resolve) => {
        const secondClient = ioc(`http://localhost:${port}`, {
          path: "/ws",
          reconnectionDelay: 0,
          forceNew: true,
        });

        const testMessage: InsertMessage = {
          content: 'test message',
          role: 'user',
          metadata: {},
        };

        let connectedClients = 0;
        let messageReceivedCount = 0;

        const onMessage = () => {
          messageReceivedCount++;
          if (messageReceivedCount === 2) { // Both clients received the message
            secondClient.close();
            resolve();
          }
        };

        secondClient.on('connect', () => {
          connectedClients++;
          if (connectedClients === 2) {
            clientSocket.emit('message', testMessage);
          }
        });

        clientSocket.on('message', onMessage);
        secondClient.on('message', onMessage);
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle message validation errors properly', () => {
      return new Promise<void>((resolve) => {
        clientSocket.on('message', (data: any) => {
          if (data.role === 'system' && data.metadata.error) {
            expect(data.metadata.validationError).toBeDefined();
            resolve();
          }
        });

        clientSocket.emit('message', { 
          content: '', // Empty content should fail validation
          role: 'user',
          metadata: {}
        });
      });
    });
  });
});