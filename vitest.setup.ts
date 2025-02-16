import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom/vitest';

// Extend Vitest's expect with Jest DOM matchers
expect.extend(matchers);

// Runs a cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock fetch for all tests
global.fetch = vi.fn();

// Mock WebSocket for all tests
global.WebSocket = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: WebSocket.CONNECTING,
})) as any;

// Add any global setup here