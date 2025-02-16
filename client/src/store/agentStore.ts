import { create } from "zustand";
import { Message, WebSocketMessage } from "@shared/schema";
import { log } from "@/lib/utils";

interface AgentState {
  messages: Message[];
  hasInsufficientBalance: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  sendMessage: (content: string, onError: (message: string) => void) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  hasInsufficientBalance: false,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
      hasInsufficientBalance: Boolean(
        message.metadata?.error &&
        message.content.includes("temporarily unavailable")
      )
    }));
  },

  setMessages: (messages) => {
    set({ messages });
  },

  sendMessage: (content: string, onError: (message: string) => void) => {
    const { hasInsufficientBalance } = get();

    if (hasInsufficientBalance) {
      onError("Please check the service status before trying again.");
      return;
    }

    try {
      // Create a properly formatted WebSocket message
      const message: WebSocketMessage = {
        content,
        role: "user",
        metadata: {},
        timestamp: new Date(),
        agentId: null,
        serviceId: null
      };

      // The actual sending is now handled by the useWebSocket hook
      set((state) => ({
        messages: [...state.messages, message as Message]
      }));

      log("Message queued successfully", { 
        level: 'debug',
        context: { messageContent: content }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log("Error preparing message", { 
        level: 'error',
        context: { error: errorMessage }
      });
      onError("Error preparing message. Please try again.");
    }
  },
}));