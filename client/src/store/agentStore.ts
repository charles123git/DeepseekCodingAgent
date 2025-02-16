import { create } from "zustand";
import { Message, Agent } from "@shared/schema";
import { log } from "@/lib/utils";

interface AgentState {
  messages: Message[];
  agents: Agent[];
  hasInsufficientBalance: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setAgents: (agents: Agent[]) => void;
  sendMessage: (content: string, onError: (message: string) => void) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  agents: [],
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

  setAgents: (agents) => {
    set({ agents });
  },

  sendMessage: (content: string, onError: (message: string) => void) => {
    const { hasInsufficientBalance } = get();

    if (hasInsufficientBalance) {
      onError("Please check the service status before trying again.");
      return;
    }

    try {
      // Create a properly formatted message object
      const message = {
        content,
        role: "user" as const,
        metadata: {},
      };

      // The actual sending is now handled by the useWebSocket hook
      // This store just manages the state
      set((state) => ({
        messages: [...state.messages, message]
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