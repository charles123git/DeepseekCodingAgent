import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Extend Vitest's expect with Jest DOM matchers
expect.extend(matchers);

// Runs a cleanup after each test case
afterEach(() => {
  cleanup();
});

// Critical: Mock fetch API for tests
global.fetch = vi.fn(async () => ({
  ok: true,
  json: async () => ({
    choices: [{
      message: {
        content: "Test response for antifragile system",
      }
    }]
  })
}));

// Mock WebSocket for all tests
global.WebSocket = vi.fn(() => ({
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  close: vi.fn(),
  send: vi.fn(),
  readyState: WebSocket.CONNECTING,
})) as any;

// Add error boundary for test environment
global.process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection in tests:', err);
});

// Add console error wrapper to help debug test issues
const originalError = console.error;
console.error = (...args) => {
  // Only log the error in test environment, don't throw
  if (process.env.NODE_ENV === 'test') {
    originalError.apply(console, args);
  }
};

// Add any global setup here