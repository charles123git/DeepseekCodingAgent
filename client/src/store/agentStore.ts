import { create } from "zustand";
import { Message, Agent } from "@shared/schema";
import { createWebSocket } from "@/lib/socket";

interface AgentState {
  messages: Message[];
  agents: Agent[];
  socket: WebSocket | null;
  hasInsufficientBalance: boolean;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setAgents: (agents: Agent[]) => void;
  initializeSocket: () => void;
  sendMessage: (content: string, onError: (message: string) => void) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  agents: [],
  socket: null,
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

  initializeSocket: () => {
    const socket = createWebSocket();

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        get().addMessage(message);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event.code, event.reason);
      // Only attempt reconnection if not a normal closure
      if (event.code !== 1000) {
        setTimeout(() => get().initializeSocket(), 1000);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    set({ socket });
  },

  sendMessage: (content: string, onError: (message: string) => void) => {
    const { socket, hasInsufficientBalance } = get();

    if (hasInsufficientBalance) {
      onError("Please check the service status before trying again.");
      return;
    }

    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        content,
        role: "user",
        metadata: {},
        timestamp: new Date().toISOString(),
      }));
    } else {
      onError("Not connected to server. Please try again in a moment.");
    }
  },
}));