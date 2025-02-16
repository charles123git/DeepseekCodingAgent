import { Message, InsertMessage } from "@shared/schema";
import { IStorage } from "../storage";
import { DeepSeekService } from "../services/deepseek";

export class AgentManager {
  private storage: IStorage;
  private deepseek: DeepSeekService;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.deepseek = new DeepSeekService();
  }

  async handleMessage(message: Message): Promise<InsertMessage | null> {
    if (message.role === "user") {
      try {
        const response = await this.deepseek.generateResponse(message.content);
        return {
          content: response,
          role: "assistant",
          metadata: {
            model: "deepseek-coder",
            timestamp: new Date().toISOString(),
          },
          agentId: "deepseek",
        };
      } catch (error) {
        console.error("Error in agent manager:", error);
        return {
          content: "I'm having trouble processing your request. Please try again later.",
          role: "assistant",
          metadata: {
            error: true,
            timestamp: new Date().toISOString(),
          },
          agentId: "deepseek",
        };
      }
    }
    return null;
  }
}