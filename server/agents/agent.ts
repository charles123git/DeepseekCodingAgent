import { Message, InsertMessage } from "@shared/schema";
import { IStorage } from "../storage";
import { DeepSeekService } from "../services/deepseek";
import { TogetherService } from "../services/together";
import { SYSTEM_PROMPTS, type AgentRole } from "./prompts";

interface ProviderResponse {
  content: string;
  error: boolean;
  errorType?: 'rate_limit' | 'quota_exceeded' | 'service_error';
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

      if (response.error) {
        return {
          content: "",
          error: true,
          errorType: 'service_error'
        };
      }

      return response;
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
      const errorType = this.getErrorType(error);

      return {
        content: "",
        error: true,
        errorType
      };
    }
  }

  private getErrorType(error: any): ProviderResponse['errorType'] {
    const errorMessage = error?.message?.toLowerCase() || '';
    if (errorMessage.includes('rate limit')) return 'rate_limit';
    if (errorMessage.includes('quota')) return 'quota_exceeded';
    return 'service_error';
  }

  private determineAgentRole(message: string): AgentRole {
    // Enhanced role determination based on message content
    const lowerMessage = message.toLowerCase();

    // Review related tasks
    if (lowerMessage.includes('review') || 
        lowerMessage.includes('check') ||
        lowerMessage.includes('analyze') ||
        lowerMessage.includes('test') ||
        lowerMessage.includes('validate')) {
      return 'reviewer';
    }

    // Planning related tasks
    if (lowerMessage.includes('plan') || 
        lowerMessage.includes('design') ||
        lowerMessage.includes('architect') ||
        lowerMessage.includes('structure') ||
        lowerMessage.includes('organize')) {
      return 'planner';
    }

    // Default to coder for implementation tasks
    return 'coder';
  }

  private async tryGenerateResponse(message: string, role: AgentRole): Promise<ProviderResponse> {
    this.fallbackAttempts = 0;
    let currentProvider = this.currentProvider;

    while (this.fallbackAttempts < this.MAX_FALLBACK_ATTEMPTS) {
      console.log(`Attempt ${this.fallbackAttempts + 1} using ${currentProvider}`);

      const response = await this.tryProvider(currentProvider, message, role);

      if (!response.error) {
        this.currentProvider = currentProvider; // Update successful provider
        return response;
      }

      // Switch provider and increment attempt counter
      currentProvider = currentProvider === "together" ? "deepseek" : "together";
      this.fallbackAttempts++;

      // Add delay before retry to prevent overwhelming the services
      await new Promise(resolve => setTimeout(resolve, 1000 * this.fallbackAttempts));
    }

    return {
      content: "All available providers are currently experiencing issues. Please try again later.",
      error: true,
      errorType: 'service_error'
    };
  }

  async handleMessage(message: Message): Promise<InsertMessage | null> {
    if (message.role === "user") {
      try {
        const startTime = Date.now();
        console.log("Processing user message:", message.content);

        const role = this.determineAgentRole(message.content);
        const response = await this.tryGenerateResponse(message.content, role);
        const duration = Date.now() - startTime;

        return {
          content: response.content,
          role: "assistant",
          metadata: {
            model: this.currentProvider === "together" ? "mistralai/Mixtral-8x7B-Instruct-v0.1" : "deepseek-coder",
            timestamp: new Date().toISOString(),
            error: response.error,
            errorType: response.errorType,
            provider: this.currentProvider,
            duration,
            agentRole: role
          },
          timestamp: new Date(),
          agentId: role,
          serviceId: this.currentProvider,
        };
      } catch (error) {
        console.error("Error in agent manager:", error);
        return {
          content: "An unexpected error occurred. Please try again later.",
          role: "assistant",
          metadata: {
            error: true,
            errorType: 'service_error',
            timestamp: new Date().toISOString(),
            provider: this.currentProvider
          },
          timestamp: new Date(),
          agentId: 'system',
          serviceId: 'error',
        };
      }
    }
    return null;
  }
}