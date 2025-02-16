import { create } from "zustand";
import { Message, Agent } from "@shared/schema";
import { createWebSocket } from "@/lib/socket";
import { log } from "@/lib/utils";
import type { WebSocketManager } from "@/lib/socket";

interface AgentState {
  messages: Message[];
  agents: Agent[];
  wsManager: WebSocketManager | null;
  hasInsufficientBalance: boolean;
  isConnected: boolean;
  connectionState: string;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setAgents: (agents: Agent[]) => void;
  initializeSocket: () => void;
  cleanupSocket: () => void;
  sendMessage: (content: string, onError: (message: string) => void) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  agents: [],
  wsManager: null,
  hasInsufficientBalance: false,
  isConnected: false,
  connectionState: 'disconnected',

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

  cleanupSocket: () => {
    const { wsManager } = get();
    if (wsManager) {
      wsManager.cleanup();
      set({ 
        wsManager: null, 
        isConnected: false,
        connectionState: 'disconnected'
      });
    }
  },

  initializeSocket: () => {
    // Cleanup any existing socket first
    get().cleanupSocket();

    const wsManager = createWebSocket({
      maxRetries: 5,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      healthCheckInterval: 30000,
      connectionTimeout: 5000,
    });

    // Set up message handler
    wsManager.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        get().addMessage(message);
        log("Processed incoming message", { 
          level: 'debug',
          context: { messageType: message.type }
        });
      } catch (error) {
        log("Error handling WebSocket message", { 
          level: 'error',
          context: { error: error.message || 'Unknown error' }
        });
      }
    };

    // Monitor connection state changes
    const updateConnectionState = () => {
      const state = wsManager.getState();
      set({ 
        isConnected: state === 'connected',
        connectionState: state
      });

      log("WebSocket connection state changed", { 
        level: 'info',
        context: { state }
      });
    };

    wsManager.onStateChange = updateConnectionState;

    set({ wsManager });
  },

  sendMessage: (content: string, onError: (message: string) => void) => {
    const { wsManager, hasInsufficientBalance, isConnected } = get();

    if (hasInsufficientBalance) {
      onError("Please check the service status before trying again.");
      return;
    }

    if (!isConnected) {
      onError("Not connected to server. Please try again in a moment.");
      log("Message send attempted while disconnected", { 
        level: 'warn',
        context: { connectionState: wsManager?.getState() }
      });
      return;
    }

    try {
      const message = {
        content,
        role: "user",
        metadata: {},
        timestamp: new Date().toISOString(),
      };

      wsManager?.send(JSON.stringify(message));

      log("Message sent successfully", { 
        level: 'debug',
        context: { messageContent: content }
      });
    } catch (error) {
      log("Error sending message", { 
        level: 'error',
        context: { error: error.message || 'Unknown error' }
      });
      onError("Connection issue. Please try again in a moment.");
    }
  },
}));