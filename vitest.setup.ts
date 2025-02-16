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

// Mock Socket.IO instead of native WebSocket
vi.mock('socket.io-client', () => ({
  default: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

// Add error boundary for test environment
global.process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection in tests:', err);
});

// Add console error wrapper to help debug test issues
const originalError = console.error;
console.error = (...args) => {
  // Only log the error in test environment, don't throw
  if (import.meta.env.MODE === 'test') {
    originalError.apply(console, args);
  }
};

// Add any global setup here