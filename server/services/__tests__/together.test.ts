import { describe, it, expect } from 'vitest';
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
    const response = await service.generateResponse('test fallback');

    // Basic contract test - ensures response structure
    expect(response).toEqual({
      content: expect.any(String),
      error: expect.any(Boolean)
    });
  });
});