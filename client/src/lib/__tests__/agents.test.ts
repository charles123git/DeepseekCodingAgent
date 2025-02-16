import { describe, it, expect } from 'vitest';
import { AGENT_ROLES, DEFAULT_CAPABILITIES } from '../agents';

describe('Agent Configuration', () => {
  describe('Agent Roles', () => {
    it('should define core agent roles', () => {
      expect(AGENT_ROLES).toHaveProperty('PLANNER');
      expect(AGENT_ROLES).toHaveProperty('CODER');
      expect(AGENT_ROLES).toHaveProperty('REVIEWER');
    });

    it('should have immutable role definitions', () => {
      expect(() => {
        (AGENT_ROLES as any).NEW_ROLE = 'new_role';
      }).toThrow();
    });
  });

  describe('Default Capabilities', () => {
    it('should define capabilities for all roles', () => {
      Object.values(AGENT_ROLES).forEach(role => {
        expect(DEFAULT_CAPABILITIES[role]).toBeDefined();
        expect(Array.isArray(DEFAULT_CAPABILITIES[role])).toBe(true);
      });
    });

    it('should have valid capability structure', () => {
      Object.values(DEFAULT_CAPABILITIES).forEach(capabilities => {
        capabilities.forEach(capability => {
          expect(capability).toHaveProperty('name');
          expect(capability).toHaveProperty('description');
          expect(typeof capability.name).toBe('string');
          expect(typeof capability.description).toBe('string');
        });
      });
    });

    it('should have unique capability names within each role', () => {
      Object.values(DEFAULT_CAPABILITIES).forEach(capabilities => {
        const names = capabilities.map(c => c.name);
        const uniqueNames = new Set(names);
        expect(names.length).toBe(uniqueNames.size);
      });
    });

    it('should have non-empty capabilities for each role', () => {
      Object.values(DEFAULT_CAPABILITIES).forEach(capabilities => {
        expect(capabilities.length).toBeGreaterThan(0);
      });
    });
  });
});
