export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string;
  private fallbackMode: boolean;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    this.baseUrl = "https://api.deepseek.com/v1";
    this.fallbackMode = !this.apiKey;

    if (!this.apiKey) {
      console.warn("DeepSeek API key is not set. Using fallback mode for testing.");
    }
  }

  async generateResponse(prompt: string): Promise<{ content: string; error?: boolean }> {
    if (this.fallbackMode) {
      return {
        content: "This is a test response. The assistant is currently in demo mode.",
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
          model: "deepseek-coder",
          messages: [
            {
              role: "system",
              content: "You are a helpful AI coding assistant. Provide clear, concise responses with code examples when relevant.",
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("DeepSeek API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });

        if (response.status === 402) {
          console.log("Switching to fallback mode due to API usage limits");
          this.fallbackMode = true;
          return {
            content: "I'm currently in demo mode. You can still test the interface, but responses will be simulated.",
            error: false
          };
        }

        return {
          content: "I encountered an issue processing your request. Let me switch to demo mode for now.",
          error: false
        };
      }

      const data = await response.json();
      return { content: data.choices[0].message.content };
    } catch (error) {
      console.error("DeepSeek service error:", error);
      this.fallbackMode = true;
      return {
        content: "I'm having trouble connecting to the service. I'll switch to demo mode for now so we can continue testing.",
        error: false
      };
    }
  }
}