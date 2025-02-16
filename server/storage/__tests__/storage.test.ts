import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseStorage } from '../storage';
import { db } from '../db';
import { messages, agents } from '@shared/schema';
import type { Message, InsertMessage, Agent, InsertAgent } from '@shared/schema';

describe('DatabaseStorage', () => {
  let storage: DatabaseStorage;

  beforeEach(async () => {
    storage = new DatabaseStorage();
    // Clear existing data
    await db.delete(messages);
    await db.delete(agents);
  });

  describe('Messages', () => {
    it('should store and retrieve messages', async () => {
      const insertMessage: InsertMessage = {
        content: 'Test message',
        role: 'user',
        metadata: {},
        agentId: '1',
      };

      const savedMessage = await storage.addMessage(insertMessage);
      expect(savedMessage.id).toBeDefined();
      expect(savedMessage.content).toBe(insertMessage.content);
      expect(savedMessage.role).toBe(insertMessage.role);

      const allMessages = await storage.getMessages();
      expect(allMessages).toHaveLength(1);
      expect(allMessages[0].id).toBe(savedMessage.id);
    });

    it('should return empty array when no messages exist', async () => {
      const messages = await storage.getMessages();
      expect(messages).toHaveLength(0);
    });
  });

  describe('Agents', () => {
    it('should store and retrieve agents', async () => {
      const insertAgent: InsertAgent = {
        name: 'Test Agent',
        role: 'planner',
        capabilities: [{ name: 'test', description: 'test capability' }],
      };

      const savedAgent = await storage.addAgent(insertAgent);
      expect(savedAgent.id).toBeDefined();
      expect(savedAgent.name).toBe(insertAgent.name);
      expect(savedAgent.role).toBe(insertAgent.role);

      const agent = await storage.getAgent(savedAgent.id);
      expect(agent).toBeDefined();
      expect(agent?.name).toBe(insertAgent.name);

      const allAgents = await storage.getAgents();
      expect(allAgents).toHaveLength(1);
      expect(allAgents[0].id).toBe(savedAgent.id);
    });

    it('should return undefined when agent does not exist', async () => {
      const agent = await storage.getAgent(999);
      expect(agent).toBeUndefined();
    });

    it('should handle invalid agent data gracefully', async () => {
      const invalidAgent: InsertAgent = {
        name: '',  // Invalid empty name
        role: 'invalid_role',
        capabilities: [],
      };

      await expect(storage.addAgent(invalidAgent)).rejects.toThrow();
    });
  });
});
