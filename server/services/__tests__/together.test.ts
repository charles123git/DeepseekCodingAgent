import { describe, it, expect } from 'vitest';
import { TogetherService } from '../together';

describe('TogetherService', () => {
  let service: TogetherService;

  beforeEach(() => {
    service = new TogetherService();
  });

  it('should generate response in demo mode when API key is missing', async () => {
    const response = await service.generateResponse('test prompt');
    expect(response.content).toContain('demo mode');
    expect(response.error).toBe(false);
  });

  it('should test actual API connectivity if key is present', async () => {
    // Only run this test if TOGETHER_API_KEY is available
    if (!process.env.TOGETHER_API_KEY) {
      console.log('Skipping API connectivity test - no API key available');
      return;
    }

    const prompt = "Write a simple hello world function in Python.";
    const response = await service.generateResponse(prompt);

    expect(response.error).toBe(false);
    expect(response.content).toBeTruthy();
    expect(typeof response.content).toBe('string');
    console.log('Together API Test Response:', response);
  });
});