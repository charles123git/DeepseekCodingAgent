import { z } from "zod";
import { log } from "../vite";

const togetherResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

export class TogetherService {
  private apiKey: string;
  private baseUrl: string;
  private fallbackMode: boolean;
  private model: string;

  constructor() {
    this.apiKey = process.env.TOGETHER_API_KEY || "";
    this.baseUrl = "https://api.together.xyz/v1";
    this.fallbackMode = !this.apiKey;
    // Using a serverless-compatible model
    this.model = "mistralai/Mixtral-8x7B-Instruct-v0.1";

    if (!this.apiKey) {
      log("Together API key is not set. Using fallback mode for testing.");
    } else {
      log("Together service initialized with API key");
    }
  }

  async generateResponse(prompt: string): Promise<{ content: string; error: boolean }> {
    if (this.fallbackMode) {
      log("Together service in fallback mode, returning demo response");
      return {
        content: "This is a test response. The assistant is currently in demo mode.",
        error: false
      };
    }

    try {
      log("Sending request to Together API with model: " + this.model);

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
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        log("Together API error: " + JSON.stringify({
          status: response.status,
          statusText: response.statusText,
          error: errorData,
          model: this.model,
        }));

        // Handle rate limits gracefully
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
      log("Together API response: " + JSON.stringify(data));

      const parsed = togetherResponseSchema.safeParse(data);

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
      log("Together service error: " + (error instanceof Error ? error.message : String(error)));
      return {
        content: "I'm having trouble connecting to the service. I'll switch to demo mode for now.",
        error: true
      };
    }
  }
}