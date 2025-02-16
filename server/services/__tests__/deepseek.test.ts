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

  it('should switch to demo mode when API rate limit is exceeded', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 402,
      json: () => Promise.resolve({ error: 'Insufficient credits' }),
    });

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(false);
  });

  it('should gracefully handle network connection errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('trouble connecting');
    expect(response.error).toBe(false);
  });
});
