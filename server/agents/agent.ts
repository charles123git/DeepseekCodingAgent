import { Message, InsertMessage } from "@shared/schema";
import { IStorage } from "../storage";
import { DeepSeekService } from "../services/deepseek";
import { TogetherService } from "../services/together";
import { SYSTEM_PROMPTS, type AgentRole } from "./prompts";
import { log } from "../vite";

interface ProviderResponse {
  content: string;
  error: boolean;
}

export class AgentManager {
  private storage: IStorage;
  private together: TogetherService;
  private deepseek: DeepSeekService;
  private currentProvider: "together" | "deepseek" = "together";
  private fallbackAttempts = 0;
  private readonly MAX_FALLBACK_ATTEMPTS = 2;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.together = new TogetherService();
    this.deepseek = new DeepSeekService();
  }

  private async tryProvider(
    provider: "together" | "deepseek",
    message: string,
    role: AgentRole
  ): Promise<ProviderResponse> {
    const systemPrompt = SYSTEM_PROMPTS[role];
    const fullPrompt = `${systemPrompt}\n\nUser request: ${message}`;

    try {
      const service = provider === "together" ? this.together : this.deepseek;
      const response = await service.generateResponse(fullPrompt);
      return response;
    } catch (error) {
      log(`Error with ${provider}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        content: "",
        error: true
      };
    }
  }

  private determineAgentRole(message: string): AgentRole {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('review') || 
        lowerMessage.includes('check') ||
        lowerMessage.includes('analyze')) {
      return 'reviewer';
    }

    if (lowerMessage.includes('plan') || 
        lowerMessage.includes('design') ||
        lowerMessage.includes('architect')) {
      return 'planner';
    }

    return 'coder';
  }

  private async tryGenerateResponse(message: string, role: AgentRole): Promise<ProviderResponse> {
    this.fallbackAttempts = 0;
    let currentProvider = this.currentProvider;

    while (this.fallbackAttempts < this.MAX_FALLBACK_ATTEMPTS) {
      const response = await this.tryProvider(currentProvider, message, role);

      if (!response.error && response.content) {
        this.currentProvider = currentProvider;
        return response;
      }

      currentProvider = currentProvider === "together" ? "deepseek" : "together";
      this.fallbackAttempts++;

      if (this.fallbackAttempts < this.MAX_FALLBACK_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      content: "Service unavailable. Please try again later.",
      error: true
    };
  }

  async handleMessage(message: Message): Promise<InsertMessage | null> {
    if (message.role !== "user") return null;

    try {
      const role = this.determineAgentRole(message.content);
      const response = await this.tryGenerateResponse(message.content, role);

      return {
        content: response.error ? 
          "I encountered an error processing your request. Please try again." : 
          response.content,
        role: "assistant",
        metadata: {
          provider: this.currentProvider,
          model: this.currentProvider === "together" ? 
            "mistralai/Mixtral-8x7B-Instruct-v0.1" : 
            "deepseek-coder"
        },
        timestamp: new Date(),
        agentId: null,
        serviceId: null
      };
    } catch (error) {
      log(`Error handling message: ${error instanceof Error ? error.message : String(error)}`);
      return {
        content: "An unexpected error occurred. Please try again later.",
        role: "assistant",
        metadata: { error: true },
        timestamp: new Date(),
        agentId: null,
        serviceId: null
      };
    }
  }
}