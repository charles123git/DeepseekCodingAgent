import { describe, it, expect } from 'vitest';
import { insertMessageSchema, insertAgentSchema } from '../schema';

describe('Schema Validation', () => {
  describe('Message Schema', () => {
    it('should validate valid message data', () => {
      const validMessage = {
        content: 'Test message',
        role: 'user',
        metadata: {},
        agentId: '1',
      };

      const result = insertMessageSchema.safeParse(validMessage);
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const invalidMessage = {
        content: '',
        role: 'user',
        metadata: {},
        agentId: '1',
      };

      const result = insertMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidMessage = {
        content: 'Test',
        role: 'invalid_role',
        metadata: {},
        agentId: '1',
      };

      const result = insertMessageSchema.safeParse(invalidMessage);
      expect(result.success).toBe(false);
    });

    it('should allow optional agentId', () => {
      const messageWithoutAgent = {
        content: 'Test',
        role: 'user',
        metadata: {},
      };

      const result = insertMessageSchema.safeParse(messageWithoutAgent);
      expect(result.success).toBe(true);
    });
  });

  describe('Agent Schema', () => {
    it('should validate valid agent data', () => {
      const validAgent = {
        name: 'Test Agent',
        role: 'planner',
        capabilities: [
          { name: 'test', description: 'test capability' }
        ],
      };

      const result = insertAgentSchema.safeParse(validAgent);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidAgent = {
        name: '',
        role: 'planner',
        capabilities: [],
      };

      const result = insertAgentSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });

    it('should reject invalid role', () => {
      const invalidAgent = {
        name: 'Test',
        role: 'invalid_role',
        capabilities: [],
      };

      const result = insertAgentSchema.safeParse(invalidAgent);
      expect(result.success).toBe(false);
    });

    it('should validate capabilities structure', () => {
      const agentWithInvalidCapability = {
        name: 'Test',
        role: 'planner',
        capabilities: [{ invalid: 'structure' }],
      };

      const result = insertAgentSchema.safeParse(agentWithInvalidCapability);
      expect(result.success).toBe(false);
    });
  });
});
