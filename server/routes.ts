import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertMessageSchema } from "@shared/schema";
import { AgentManager } from "./agents/agent";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling'],
  });
  const agentManager = new AgentManager(storage);

  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  io.on("connection", (socket) => {
    log("New Socket.IO connection established");

    socket.on("message", async (data) => {
      try {
        const parsed = insertMessageSchema.safeParse({
          ...data,
          metadata: data.metadata || {},
          timestamp: new Date()
        });

        if (!parsed.success) {
          socket.emit("error", {
            message: "Invalid message format",
            details: parsed.error
          });
          return;
        }

        const savedMessage = await storage.addMessage(parsed.data);
        io.emit("message", savedMessage);

        const response = await agentManager.handleMessage(savedMessage);
        if (response) {
          const savedResponse = await storage.addMessage(response);
          io.emit("message", savedResponse);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`WebSocket error: ${errorMessage}`);
        socket.emit("error", {
          message: "Failed to process message",
          error: errorMessage
        });
      }
    });

    socket.on("disconnect", () => {
      log("Socket.IO connection closed");
    });

    socket.on("error", (error) => {
      log(`Socket.IO error: ${error}`);
    });
  });

  return httpServer;
}