import { describe, it, expect, vi } from 'vitest';
import { TogetherService } from '../together';

describe('TogetherService MVP Critical Tests', () => {
  // Critical Test 1: Proper initialization and fallback
  it('should initialize properly and handle missing API key', () => {
    const originalKey = process.env.TOGETHER_API_KEY;
    process.env.TOGETHER_API_KEY = '';

    const service = new TogetherService();
    expect(service['fallbackMode']).toBe(true);
    expect(service['model']).toBe('mistralai/Mixtral-8x7B-Instruct-v0.1');

    process.env.TOGETHER_API_KEY = originalKey;
  });

  // Critical Test 2: Basic API functionality when key exists
  it('should generate responses via API when key is present', async () => {
    if (!process.env.TOGETHER_API_KEY) {
      console.log('Skipping API test - no API key available');
      return;
    }

    const service = new TogetherService();
    const response = await service.generateResponse('test message');

    expect(response).toEqual(expect.objectContaining({
      content: expect.any(String),
      error: expect.any(Boolean)
    }));
  });

  // Critical Test 3: Fallback mode behavior
  it('should provide fallback responses when needed', async () => {
    const service = new TogetherService();
    service['fallbackMode'] = true;

    const response = await service.generateResponse('test fallback');

    expect(response).toEqual({
      content: expect.stringContaining("demo mode"),
      error: false
    });
  });

  // Critical Test 4: Request format validation
  it('should format API requests correctly', async () => {
    const service = new TogetherService();
    const spy = vi.spyOn(global, 'fetch');

    await service.generateResponse('test prompt');

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining('api.together.xyz'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': expect.stringContaining('Bearer ')
        }),
        body: expect.stringContaining('mistralai/Mixtral-8x7B-Instruct-v0.1')
      })
    );

    spy.mockRestore();
  });

  // Critical Test 5: Response parsing
  it('should parse API responses correctly', async () => {
    const service = new TogetherService();
    const mockResponse = {
      choices: [{
        message: {
          content: 'test response'
        }
      }]
    };

    vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response)
    );

    const response = await service.generateResponse('test');
    expect(response.content).toBe('test response');
    expect(response.error).toBe(false);
  });

  // Critical Test 6: Error handling for rate limits
  it('should handle API rate limits appropriately', async () => {
    const service = new TogetherService();
    vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        json: () => Promise.resolve({ error: 'Rate limit exceeded' })
      } as Response)
    );

    const response = await service.generateResponse('test');

    // Should switch to fallback mode and return a demo response
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(false);
    expect(service['fallbackMode']).toBe(true);
  });

  // Critical Test 7: Invalid response format handling
  it('should handle invalid API response formats', async () => {
    const service = new TogetherService();
    vi.spyOn(global, 'fetch').mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          choices: [{ invalid: 'format' }] 
        })
      } as Response)
    );

    const response = await service.generateResponse('test');
    expect(response.error).toBe(true);
    expect(response.content).toContain('invalid response format');
  });
});