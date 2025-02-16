import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentManager } from '../agent';
import type { Message } from '@shared/schema';
import { IStorage } from '../../storage';

// Mock storage implementation
class MockStorage implements IStorage {
  async getMessages() { return []; }
  async addMessage(message: any) { return { id: 1, ...message }; }
  async getAgents() { return []; }
  async addAgent(agent: any) { return { id: 1, ...agent }; }
  async getAgent(id: number) { return undefined; }
}

// Mock AI service responses for different agent roles
const mockResponses = {
  planner: {
    content: `Here's a step-by-step plan for your todo app:
1. Design Data Model
   - Define task schema
   - Plan user schema

2. Implement Core Features
   - Add task creation
   - Add task completion
   - Add task deletion

3. Setup Testing
   - Unit tests
   - Integration tests`,
    error: false
  },
  coder: {
    content: `Here's the implementation of the Task class:
\`\`\`typescript
class Task {
  constructor(
    public id: string,
    public title: string,
    public completed: boolean = false
  ) {}

  toggleComplete() {
    this.completed = !this.completed;
  }
}
\`\`\``,
    error: false
  },
  reviewer: {
    content: `Code Review Feedback:
1. Security Considerations:
   - Input validation needed
   - Add rate limiting

2. Performance Issues:
   - Optimize database queries
   - Add caching

3. Testing Gaps:
   - Add error cases
   - Increase coverage`,
    error: false
  }
};

describe('AgentManager Tests', () => {
  let manager: AgentManager;
  let storage: IStorage;

  beforeEach(() => {
    storage = new MockStorage();
    manager = new AgentManager(storage);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Agent Role Detection', () => {
    // Test 1: Planner Detection
    it('should detect and respond as planner agent', async () => {
      vi.spyOn(manager as any, 'tryProvider').mockImplementation(
        async (_provider: string, _message: string, role: string) => {
          return role === 'planner' ? mockResponses.planner : { content: '', error: true };
        }
      );

      const message: Message = {
        id: 1,
        content: 'plan a simple todo app',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(response).toBeDefined();
      expect(response?.metadata?.agentRole).toBe('planner');
      expect(response?.agentId).toBe('planner');

      const content = response?.content.toLowerCase();
      expect(content).toContain('step');
      expect(content).toMatch(/\d\.|•|-/);
      expect(content).toContain('design');
      expect(content).toContain('implement');
    });

    // Test 2: Coder Detection
    it('should detect and respond as coder agent', async () => {
      vi.spyOn(manager as any, 'tryProvider').mockImplementation(
        async (_provider: string, _message: string, role: string) => {
          return role === 'coder' ? mockResponses.coder : { content: '', error: true };
        }
      );

      const message: Message = {
        id: 1,
        content: 'write a Task class',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(response).toBeDefined();
      expect(response?.metadata?.agentRole).toBe('coder');
      expect(response?.agentId).toBe('coder');

      const content = response?.content.toLowerCase();
      expect(content).toContain('class');
      expect(content).toMatch(/constructor|function/);
    });

    // Test 3: Reviewer Detection
    it('should detect and respond as reviewer agent', async () => {
      vi.spyOn(manager as any, 'tryProvider').mockImplementation(
        async (_provider: string, _message: string, role: string) => {
          return role === 'reviewer' ? mockResponses.reviewer : { content: '', error: true };
        }
      );

      const message: Message = {
        id: 1,
        content: 'review my todo application code',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(response).toBeDefined();
      expect(response?.metadata?.agentRole).toBe('reviewer');
      expect(response?.agentId).toBe('reviewer');

      const content = response?.content.toLowerCase();
      expect(content).toContain('security');
      expect(content).toContain('performance');
      expect(content).toContain('test');
    });
  });

  describe('Error Handling', () => {
    // Test 4: Service Error Handling
    it('should handle service errors gracefully', async () => {
      vi.spyOn(manager as any, 'tryProvider').mockImplementation(
        async () => ({ content: '', error: true, errorType: 'service_error' })
      );

      const message: Message = {
        id: 1,
        content: 'test error handling',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(response).toBeDefined();
      expect(response?.metadata?.error).toBe(true);
      expect(response?.metadata?.errorType).toBe('service_error');
    });

    // Test 5: Provider Fallback
    it('should attempt fallback when primary service fails', async () => {
      const providerSpy = vi.spyOn(manager as any, 'tryProvider');
      let callCount = 0;

      providerSpy.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { content: '', error: true, errorType: 'rate_limit' };
        }
        return mockResponses.coder;
      });

      const message: Message = {
        id: 1,
        content: 'write a simple function',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(response).toBeDefined();
      expect(providerSpy).toHaveBeenCalledTimes(2);
      expect(response?.content).toContain('class');
    });

    // Test 6: Non-user Message Handling
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
});