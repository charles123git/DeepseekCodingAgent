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

  async generateResponse(prompt: string): Promise<string> {
    if (!this.apiKey) {
      return "I cannot respond at the moment as the API key is not configured. Please contact the administrator.";
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
        const errorData = await response.text();
        console.error("DeepSeek API error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData,
        });
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("DeepSeek service error:", error);
      return "I encountered an error while processing your request. Please try again in a moment.";
    }
  }
}