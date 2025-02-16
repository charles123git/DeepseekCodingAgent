import { describe, it, expect } from 'vitest';
import { AgentManager } from '../agent';
import type { Message } from '@shared/schema';
import { IStorage } from '../../storage';

// Minimal mock storage for critical testing
class MockStorage implements IStorage {
  async getMessages() { return []; }
  async addMessage(message: any) { return { id: 1, ...message }; }
  async getAgents() { return []; }
  async addAgent(agent: any) { return { id: 1, ...agent }; }
  async getAgent(id: number) { return undefined; }
}

describe('AgentManager Critical Tests', () => {
  let manager: AgentManager;
  let storage: IStorage;

  beforeEach(() => {
    storage = new MockStorage();
    manager = new AgentManager(storage);
  });

  // Critical Test 1: Basic message handling
  it('should handle user messages correctly', async () => {
    const message: Message = {
      id: 1,
      content: 'Write a simple function',
      role: 'user',
      metadata: {},
      timestamp: new Date(),
    };

    const response = await manager.handleMessage(message);
    expect(response).toBeDefined();
    expect(response?.role).toBe('assistant');
    expect(response?.content.length).toBeGreaterThan(0);
    expect(response?.metadata?.provider).toBeDefined();
  });

  // Critical Test 2: Provider fallback chain
  it('should attempt fallback when primary service fails', async () => {
    const message: Message = {
      id: 1,
      content: 'test fallback',
      role: 'user',
      metadata: {},
      timestamp: new Date(),
    };

    const response = await manager.handleMessage(message);
    expect(response).toBeDefined();
    expect(response?.metadata?.provider).toBeDefined();
    expect(response?.content.length).toBeGreaterThan(0);
    expect(response?.role).toBe('assistant');
  });

  // Critical Test 3: Non-user message handling
  it('should not process non-user messages', async () => {
    const message: Message = {
      id: 1,
      content: 'test message',
      role: 'assistant',
      metadata: {},
      timestamp: new Date(),
    };

    const response = await manager.handleMessage(message);
    expect(response).toBeNull();
  });
});