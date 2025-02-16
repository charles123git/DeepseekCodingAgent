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
      return await service.generateResponse(fullPrompt);
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
      return {
        content: "",
        error: true,
        errorType: this.getErrorType(error)
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
    // Simple role determination based on message content
    if (message.toLowerCase().includes('review') || 
        message.toLowerCase().includes('check') ||
        message.toLowerCase().includes('analyze')) {
      return 'reviewer';
    }
    if (message.toLowerCase().includes('plan') || 
        message.toLowerCase().includes('design') ||
        message.toLowerCase().includes('architecture')) {
      return 'planner';
    }
    return 'coder'; // Default to coder for code generation
  }

  private async tryGenerateResponse(message: string, role: AgentRole): Promise<ProviderResponse> {
    this.fallbackAttempts = 0;
    let currentProvider = this.currentProvider;

    while (this.fallbackAttempts < this.MAX_FALLBACK_ATTEMPTS) {
      console.log(`Attempt ${this.fallbackAttempts + 1} using ${currentProvider}`);

      const response = await this.tryProvider(currentProvider, message, role);

      if (!response.error) {
        return response;
      }

      if (response.errorType === 'service_error' || 
          this.fallbackAttempts === this.MAX_FALLBACK_ATTEMPTS - 1) {
        return {
          content: "I'm currently experiencing technical difficulties. Please try again in a moment.",
          error: true,
          errorType: 'service_error'
        };
      }

      // Switch provider and increment attempt counter
      currentProvider = currentProvider === "together" ? "deepseek" : "together";
      this.fallbackAttempts++;
    }

    return {
      content: "All available providers are currently unavailable. Please try again later.",
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
          agentId: role,
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
          agentId: 'system',
        };
      }
    }
    return null;
  }
}