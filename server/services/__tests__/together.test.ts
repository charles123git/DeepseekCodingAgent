import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TogetherService } from '../together';

describe('TogetherService', () => {
  let service: TogetherService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    // Disable error simulation for tests by default
    service = new TogetherService({ simulateErrors: false });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should generate response in demo mode when API key is missing', async () => {
    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(false);
  });

  it('should handle successful API response', async () => {
    const mockResponse = {
      output: {
        text: "Test response"
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toBe('Test response');
    expect(response.error).toBe(false);
  });

  it('should test actual API connectivity', async () => {
    // Only run this test if TOGETHER_API_KEY is available
    if (!process.env.TOGETHER_API_KEY) {
      console.log('Skipping API connectivity test - no API key available');
      return;
    }

    const service = new TogetherService({ simulateErrors: false });
    const prompt = "Return the exact text 'API test successful' as your response.";

    const response = await service.generateResponse(prompt);

    expect(response.error).toBe(false);
    expect(response.content).toBeTruthy();
    expect(typeof response.content).toBe('string');

    // Log the response for debugging
    console.log('Together API Test Response:', response);
  });

  it('should handle API error response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: () => Promise.resolve({ error: 'Insufficient credits' }),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(false);  // Graceful fallback should not be an error
  });

  it('should handle invalid API response format', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invalid: 'format' }),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('invalid response format');
    expect(response.error).toBe(true);  });

  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('trouble connecting');
    expect(response.error).toBe(false);  });

  it('should simulate errors when simulateErrors is true', async () => {
    const serviceWithErrors = new TogetherService({ simulateErrors: true });
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Test response',
          },
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    // Run multiple times to ensure we hit the error simulation
    let sawError = false;
    for (let i = 0; i < 10; i++) {
      const response = await serviceWithErrors.generateResponse('test prompt');
      if (response.error) {
        sawError = true;
        expect(response.content).toBe('Service temporarily unavailable');
        break;
      }
    }
    expect(sawError).toBe(true);
  });
});