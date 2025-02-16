import { Message, InsertMessage } from "@shared/schema";
import { IStorage } from "../storage";
import { DeepSeekService } from "../services/deepseek";
import { TogetherService } from "../services/together";

export class AgentManager {
  private storage: IStorage;
  private together: TogetherService;
  private deepseek: DeepSeekService;
  private currentProvider: "together" | "deepseek" = "together";

  constructor(storage: IStorage) {
    this.storage = storage;
    this.together = new TogetherService();
    this.deepseek = new DeepSeekService();
  }

  private async tryGenerateResponse(message: string): Promise<{ content: string; error: boolean }> {
    try {
      console.log("Attempting to generate response using:", this.currentProvider);

      const response = await this.together.generateResponse(message);
      if (!response.error) {
        return response;
      }

      console.log("Together.ai failed, falling back to DeepSeek");
      this.currentProvider = "deepseek";
      return await this.deepseek.generateResponse(message);
    } catch (error) {
      console.error("Error in tryGenerateResponse:", error);
      return {
        content: "I'm having trouble processing your request. Please try again.",
        error: true
      };
    }
  }

  async handleMessage(message: Message): Promise<InsertMessage | null> {
    if (message.role === "user") {
      try {
        const startTime = Date.now();
        console.log("Processing user message:", message.content);

        const response = await this.tryGenerateResponse(message.content);
        const duration = Date.now() - startTime;
        console.log(`Generated response in ${duration}ms`);

        return {
          content: response.content || "No response generated",
          role: "assistant",
          metadata: {
            model: this.currentProvider === "together" ? "mistralai/Mixtral-8x7B-Instruct-v0.1" : "deepseek-coder",
            timestamp: new Date().toISOString(),
            error: response.error || false,
            provider: this.currentProvider,
            duration
          },
          agentId: this.currentProvider,
        };
      } catch (error) {
        console.error("Error in agent manager:", error);
        return {
          content: "I'm having trouble processing your request. Please try again later.",
          role: "assistant",
          metadata: {
            error: true,
            timestamp: new Date().toISOString(),
            provider: this.currentProvider
          },
          agentId: this.currentProvider,
        };
      }
    }
    return null;
  }
}