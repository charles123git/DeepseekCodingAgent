import { z } from "zod";
import { log } from "../vite";

const deepseekResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string;
  private fallbackMode: boolean;
  private model: string;
  private simulateErrors: boolean;

  constructor(options = { simulateErrors: false }) {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    this.baseUrl = "https://api.deepseek.com/v1";
    this.fallbackMode = !this.apiKey;
    this.model = "deepseek-coder";
    this.simulateErrors = options.simulateErrors;

    if (!this.apiKey) {
      log("DeepSeek API key is not set. Using fallback mode for testing.");
    } else {
      log("DeepSeek service initialized with API key");
    }
  }

  async generateResponse(prompt: string): Promise<{ content: string; error: boolean }> {
    if (this.fallbackMode) {
      log("DeepSeek service in fallback mode, returning demo response");
      return {
        content: "This is a test response. The assistant is currently in demo mode.",
        error: false
      };
    }

    try {
      log("Sending request to DeepSeek API with model: " + this.model);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: "You are a helpful AI coding assistant. Provide clear, concise responses with code examples when relevant.",
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        log("DeepSeek API error: " + JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        }));

        // Handle rate limits by switching to fallback mode
        if (response.status === 402 || response.status === 429) {
          log("API usage limits reached, switching to fallback mode");
          this.fallbackMode = true;
          return {
            content: "I'm currently in demo mode due to API limits. You can still test the interface, but responses will be simulated.",
            error: false
          };
        }

        return {
          content: "I encountered an issue processing your request. Let me switch to demo mode for now.",
          error: true
        };
      }

      const data = await response.json();
      log("DeepSeek API response: " + JSON.stringify(data));

      const parsed = deepseekResponseSchema.safeParse(data);

      if (!parsed.success) {
        log("Invalid API response format: " + JSON.stringify(parsed.error));
        return {
          content: "Received an invalid response format. Switching to demo mode.",
          error: true
        };
      }

      return { 
        content: parsed.data.choices[0].message.content,
        error: false
      };
    } catch (error) {
      log("DeepSeek service error: " + (error instanceof Error ? error.message : String(error)));
      this.fallbackMode = true;
      return {
        content: "I'm having trouble connecting to the service. I'll switch to demo mode for now.",
        error: true
      };
    }
  }
}