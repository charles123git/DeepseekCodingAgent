export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    this.baseUrl = "https://api.deepseek.com/v1";

    if (!this.apiKey) {
      console.warn("DeepSeek API key is not set. The assistant will not be able to respond.");
    }
  }

  async generateResponse(prompt: string): Promise<{ content: string; error?: boolean }> {
    if (!this.apiKey) {
      return {
        content: "The DeepSeek API key is not configured. Please contact the administrator.",
        error: true
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
          return {
            content: "The AI service is temporarily unavailable due to system maintenance. Your message has been received but cannot be processed at this time. Please try again later.",
            error: true
          };
        }

        return {
          content: "An error occurred while processing your request. Please try again later.",
          error: true
        };
      }

      const data = await response.json();
      return { content: data.choices[0].message.content };
    } catch (error) {
      console.error("DeepSeek service error:", error);
      return {
        content: "A network error occurred while processing your request. Please check your connection and try again.",
        error: true
      };
    }
  }
}