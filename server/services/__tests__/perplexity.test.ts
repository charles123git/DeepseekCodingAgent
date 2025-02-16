import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PerplexityService } from '../perplexity';

describe('PerplexityService', () => {
  let service: PerplexityService;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    service = new PerplexityService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should return demo mode response when API key is not configured', async () => {
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

  it('should handle API rate limit exceeded', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(true);
  });

  it('should handle invalid response format', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ invalid: 'format' }),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('invalid response format');
    expect(response.error).toBe(true);
  });

  it('should handle network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('trouble connecting');
    expect(response.error).toBe(true);
  });

  it('should handle API payment required error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: () => Promise.resolve({ error: 'Payment required' }),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(true);
  });
});
