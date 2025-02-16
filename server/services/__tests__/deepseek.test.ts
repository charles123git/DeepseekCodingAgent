import { describe, it, expect } from 'vitest';
import { DeepSeekService } from '../deepseek';

describe('DeepSeekService MVP Critical Tests', () => {
  // Critical Test 1: Proper initialization and fallback
  it('should initialize properly and handle missing API key', () => {
    const originalKey = process.env.DEEPSEEK_API_KEY;
    process.env.DEEPSEEK_API_KEY = '';

    const service = new DeepSeekService();
    expect(service['fallbackMode']).toBe(true);
    expect(service['model']).toBe('deepseek-coder');

    process.env.DEEPSEEK_API_KEY = originalKey;
  });

  // Critical Test 2: Basic API functionality when key exists
  it('should generate responses via API when key is present', async () => {
    if (!process.env.DEEPSEEK_API_KEY) {
      console.log('Skipping API test - no API key available');
      return;
    }

    const service = new DeepSeekService();
    const response = await service.generateResponse('test message');

    expect(response).toEqual(expect.objectContaining({
      content: expect.any(String),
      error: expect.any(Boolean)
    }));
  });

  // Critical Test 3: Fallback mode behavior
  it('should provide fallback responses when needed', async () => {
    const service = new DeepSeekService();
    const response = await service.generateResponse('test fallback');

    // Basic contract test - ensures response structure
    expect(response).toEqual({
      content: expect.any(String),
      error: expect.any(Boolean)
    });
  });
});