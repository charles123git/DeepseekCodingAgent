import { Message, InsertMessage } from "@shared/schema";
import { IStorage } from "../storage";
import { DeepSeekService } from "../services/deepseek";
import { TogetherService } from "../services/together";
import { SYSTEM_PROMPTS, type AgentRole } from "./prompts";
import { log } from "../vite";

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
    log("AgentManager initialized with both AI providers");
  }

  private async tryProvider(
    provider: "together" | "deepseek",
    message: string,
    role: AgentRole
  ): Promise<ProviderResponse> {
    const systemPrompt = SYSTEM_PROMPTS[role];
    const fullPrompt = `${systemPrompt}\n\nUser request: ${message}`;

    log(`Attempting to generate response using ${provider}`);
    log(`Role: ${role}, Prompt length: ${fullPrompt.length}`);

    try {
      const service = provider === "together" ? this.together : this.deepseek;
      const response = await service.generateResponse(fullPrompt);

      if (response.error) {
        log(`${provider} provider error: ${response.errorType}`);
        return {
          content: "",
          error: true,
          errorType: 'service_error'
        };
      }

      log(`${provider} generated response successfully`);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error with ${provider}: ${errorMessage}`);
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
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('review') || 
        lowerMessage.includes('check') ||
        lowerMessage.includes('analyze') ||
        lowerMessage.includes('test') ||
        lowerMessage.includes('validate')) {
      log("Determined role: reviewer");
      return 'reviewer';
    }

    if (lowerMessage.includes('plan') || 
        lowerMessage.includes('design') ||
        lowerMessage.includes('architect') ||
        lowerMessage.includes('structure') ||
        lowerMessage.includes('organize')) {
      log("Determined role: planner");
      return 'planner';
    }

    log("Determined role: coder (default)");
    return 'coder';
  }

  async handleMessage(message: Message): Promise<InsertMessage | null> {
    if (message.role === "user") {
      try {
        const startTime = Date.now();
        log(`Processing user message: "${message.content}"`);

        const role = this.determineAgentRole(message.content);
        const response = await this.tryGenerateResponse(message.content, role);
        const duration = Date.now() - startTime;

        if (response.error) {
          log(`Failed to generate response: ${response.errorType}`);
        } else {
          log(`Successfully generated response in ${duration}ms`);
        }

        return {
          content: response.content || "I apologize, but I encountered an error while processing your request. Please try again.",
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`Critical error in agent manager: ${errorMessage}`);
        return {
          content: "An unexpected error occurred while processing your request. Please try again later.",
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

  private async tryGenerateResponse(message: string, role: AgentRole): Promise<ProviderResponse> {
    this.fallbackAttempts = 0;
    let currentProvider = this.currentProvider;

    log(`Starting response generation with provider: ${currentProvider}`);

    while (this.fallbackAttempts < this.MAX_FALLBACK_ATTEMPTS) {
      log(`Attempt ${this.fallbackAttempts + 1} using ${currentProvider}`);

      const response = await this.tryProvider(currentProvider, message, role);

      if (!response.error) {
        this.currentProvider = currentProvider;
        return response;
      }

      currentProvider = currentProvider === "together" ? "deepseek" : "together";
      this.fallbackAttempts++;

      if (this.fallbackAttempts < this.MAX_FALLBACK_ATTEMPTS) {
        log(`Switching to fallback provider: ${currentProvider}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.fallbackAttempts));
      }
    }

    log("All provider attempts exhausted");
    return {
      content: "All available providers are currently experiencing issues. Please try again later.",
      error: true,
      errorType: 'service_error'
    };
  }
}