import { z } from "zod";

const perplexityResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

export class PerplexityService {
  private apiKey: string;
  private baseUrl: string;
  private fallbackMode: boolean;

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || "";
    this.baseUrl = "https://api.perplexity.ai";
    this.fallbackMode = !this.apiKey;

    if (!this.apiKey) {
      console.warn("Perplexity API key is not set. Using fallback mode for testing.");
    }
  }

  async generateResponse(prompt: string): Promise<{ content: string; error?: boolean }> {
    if (this.fallbackMode) {
      return {
        content: "This is a test response. Perplexity assistant is in demo mode.",
        error: false
      };
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-small-128k-online",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI coding assistant. Provide clear, concise responses with code examples when relevant.",
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
          max_tokens: 1000,
          stream: false
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Perplexity API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 402 || response.status === 429) {
          console.log("Switching to fallback mode due to API usage limits");
          this.fallbackMode = true;
          return {
            content: "I'm currently in demo mode due to API limits. You can still test the interface, but responses will be simulated.",
            error: true
          };
        }

        return {
          content: "I encountered an issue processing your request. Let me switch to demo mode for now.",
          error: true
        };
      }

      const data = await response.json();
      const parsed = perplexityResponseSchema.safeParse(data);
      
      if (!parsed.success) {
        console.error("Invalid API response format:", parsed.error);
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
      console.error("Perplexity service error:", error);
      this.fallbackMode = true;
      return {
        content: "I'm having trouble connecting to the service. I'll switch to demo mode for now.",
        error: true
      };
    }
  }
}
