import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentManager } from '../agent';
import type { Message } from '../../shared/schema';
import { IStorage } from '../../storage';

// Mock storage implementation
class MockStorage implements IStorage {
  async getMessages() { return []; }
  async addMessage(message: any) { return { id: 1, ...message }; }
  async getAgents() { return []; }
  async addAgent(agent: any) { return { id: 1, ...agent }; }
  async getAgent(id: number) { return undefined; }
}

describe('AgentManager', () => {
  let manager: AgentManager;
  let storage: IStorage;

  beforeEach(() => {
    storage = new MockStorage();
    manager = new AgentManager(storage);
  });

  it('should not respond to non-user messages', async () => {
    const message: Message = {
      id: 1,
      content: 'test',
      role: 'assistant',
      metadata: {},
      timestamp: new Date(),
    };

    const response = await manager.handleMessage(message);
    expect(response).toBeNull();
  });

  it('should generate response for user messages', async () => {
    const message: Message = {
      id: 1,
      content: 'test question',
      role: 'user',
      metadata: {},
      timestamp: new Date(),
    };

    const response = await manager.handleMessage(message);
    expect(response).toBeDefined();
    expect(response?.role).toBe('assistant');
    expect(response?.content).toBeDefined();
    expect(response?.metadata?.provider).toBeDefined();
  });

  it('should handle provider errors and fallback gracefully', async () => {
    const message: Message = {
      id: 1,
      content: 'test question',
      role: 'user',
      metadata: {},
      timestamp: new Date(),
    };

    // First response should be from the primary service
    const response1 = await manager.handleMessage(message);
    expect(response1?.metadata?.provider).toBeDefined();
    expect(response1?.metadata?.error).toBe(false);

    // Second response should fall back to alternative service
    const response2 = await manager.handleMessage(message);
    expect(response2?.metadata?.provider).toBeDefined();
    expect(response2?.metadata?.error).toBe(false);
  });

  it('should include complete metadata in responses', async () => {
    const message: Message = {
      id: 1,
      content: 'test question',
      role: 'user',
      metadata: {},
      timestamp: new Date(),
    };

    const response = await manager.handleMessage(message);
    expect(response?.metadata?.provider).toBeDefined();
    expect(response?.metadata?.model).toBeDefined();
    expect(response?.metadata?.timestamp).toBeDefined();
    expect(response?.metadata?.error).toBe(false);
  });
});