import { create } from "zustand";
import { Message, Agent } from "@shared/schema";
import { createWebSocket } from "@/lib/socket";

interface AgentState {
  messages: Message[];
  agents: Agent[];
  socket: WebSocket | null;
  addMessage: (message: Message) => void;
  setAgents: (agents: Agent[]) => void;
  initializeSocket: () => void;
  sendMessage: (content: string) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: [],
  agents: [],
  socket: null,

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setAgents: (agents) => {
    set({ agents });
  },

  initializeSocket: () => {
    const socket = createWebSocket();
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      get().addMessage(message);
    };

    socket.onclose = () => {
      setTimeout(() => get().initializeSocket(), 1000);
    };

    set({ socket });
  },

  sendMessage: (content: string) => {
    const { socket } = get();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        content,
        role: "user",
        timestamp: new Date(),
      }));
    }
  },
}));
