import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DeepSeekService } from '../deepseek';

describe('DeepSeekService', () => {
  let service: DeepSeekService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new DeepSeekService();
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

    const response = await service.generateResponse('test prompt');
    expect(response.content).toBe('Test response');
    expect(response.error).toBe(false);
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

  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('trouble connecting');
    expect(response.error).toBe(false);  // Graceful fallback should not be an error
  });
});
