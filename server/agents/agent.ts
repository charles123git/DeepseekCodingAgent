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
      const response = await this.deepseek.generateResponse(message.content);
      return {
        content: response,
        role: "assistant",
        metadata: {},
        agentId: "deepseek",
      };
    }
    return null;
  }
}
