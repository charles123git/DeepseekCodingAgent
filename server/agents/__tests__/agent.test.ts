import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentManager } from '../agent';
import { Message } from '@shared/schema';
import { IStorage } from '../../storage';

// Mock storage implementation
class MockStorage implements IStorage {
  async getMessages() { return []; }
  async addMessage(message: any) { return { id: 1, ...message }; }
  async getAgents() { return []; }
  async addAgent(agent: any) { return { id: 1, ...agent }; }
  async getAgent(id: number) { return null; }
}

// Store mock responses separately for reuse
const mockResponses = {
  planner: {
    content: 'Planning phase response',
    error: false,
    metadata: {
      role: 'planner',
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1'
    }
  },
  coder: {
    content: 'Implementation phase response',
    error: false,
    metadata: {
      role: 'coder',
      model: 'deepseek-coder'
    }
  },
  reviewer: {
    content: 'Code review feedback',
    error: false,
    metadata: {
      role: 'reviewer',
      model: 'mistralai/Mixtral-8x7B-Instruct-v0.1'
    }
  }
};

describe('AgentManager Tests', () => {
  let manager: AgentManager;
  let storage: IStorage;
  let mockProvider: any;

  beforeEach(() => {
    storage = new MockStorage();
    manager = new AgentManager(storage);
    mockProvider = vi.spyOn(manager as any, 'tryProvider');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Agent Role Detection and Switching', () => {
    it('should detect role from planning-related keywords', async () => {
      const planningKeywords = [
        'plan', 'design', 'architect', 'structure', 'organize'
      ];

      for (const keyword of planningKeywords) {
        mockProvider.mockImplementationOnce(async () => mockResponses.planner);

        const message: Message = {
          id: 1,
          content: `Please ${keyword} a new feature`,
          role: 'user',
          metadata: {},
          timestamp: new Date(),
        };

        const response = await manager.handleMessage(message);
        expect(response?.metadata?.agentRole).toBe('planner');
        expect(response?.content).toBe(mockResponses.planner.content);
      }
    });

    it('should detect role from code-related keywords', async () => {
      const codingKeywords = [
        'implement', 'code', 'write', 'develop', 'build'
      ];

      for (const keyword of codingKeywords) {
        mockProvider.mockImplementationOnce(async () => mockResponses.coder);

        const message: Message = {
          id: 1,
          content: `Please ${keyword} this feature`,
          role: 'user',
          metadata: {},
          timestamp: new Date(),
        };

        const response = await manager.handleMessage(message);
        expect(response?.metadata?.agentRole).toBe('coder');
        expect(response?.content).toBe(mockResponses.coder.content);
      }
    });

    it('should detect role from review-related keywords', async () => {
      const reviewKeywords = [
        'review', 'check', 'analyze', 'test', 'validate'
      ];

      for (const keyword of reviewKeywords) {
        mockProvider.mockImplementationOnce(async () => mockResponses.reviewer);

        const message: Message = {
          id: 1,
          content: `Please ${keyword} this code`,
          role: 'user',
          metadata: {},
          timestamp: new Date(),
        };

        const response = await manager.handleMessage(message);
        expect(response?.metadata?.agentRole).toBe('reviewer');
        expect(response?.content).toBe(mockResponses.reviewer.content);
      }
    });

    it('should handle role transitions properly', async () => {
      const transitions = [
        { message: 'Plan the new feature', expectedRole: 'planner', response: mockResponses.planner },
        { message: 'Implement the feature now', expectedRole: 'coder', response: mockResponses.coder },
        { message: 'Review the implementation', expectedRole: 'reviewer', response: mockResponses.reviewer }
      ];

      for (const transition of transitions) {
        mockProvider.mockImplementationOnce(async () => transition.response);

        const message: Message = {
          id: 1,
          content: transition.message,
          role: 'user',
          metadata: {},
          timestamp: new Date(),
        };

        const response = await manager.handleMessage(message);
        expect(response?.metadata?.agentRole).toBe(transition.expectedRole);
        expect(response?.content).toBe(transition.response.content);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockProvider.mockImplementation(async () => ({
        content: 'Error occurred',
        error: true,
        errorType: 'service_error'
      }));

      const message: Message = {
        id: 1,
        content: 'test error handling',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(response?.metadata?.error).toBe(true);
      expect(response?.metadata?.errorType).toBe('service_error');
    });

    it('should attempt provider fallback when primary fails', async () => {
      let callCount = 0;
      mockProvider.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { content: '', error: true, errorType: 'service_error' };
        }
        return mockResponses.coder;
      });

      const message: Message = {
        id: 1,
        content: 'write a function',
        role: 'user',
        metadata: {},
        timestamp: new Date(),
      };

      const response = await manager.handleMessage(message);
      expect(mockProvider).toHaveBeenCalledTimes(2);
      expect(response?.content).toBe(mockResponses.coder.content);
    });
  });
});