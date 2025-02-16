import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertMessageSchema, insertAgentSchema } from "@shared/schema";
import { AgentManager } from "./agents/agent";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    path: "/ws",
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });
  const agentManager = new AgentManager(storage);

  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse({
      ...req.body,
      timestamp: new Date(req.body.timestamp)
    });
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const message = await storage.addMessage(parsed.data);
    const response = await agentManager.handleMessage(message);
    if (response) {
      const savedResponse = await storage.addMessage(response);
      io.emit("message", savedResponse); // Added to ensure WebSocket clients get the response
      res.json([message, savedResponse]);
      return;
    }
    res.json([message]);
  });

  io.on("connection", (socket) => {
    log("New Socket.IO connection established");

    socket.on("message", async (data) => {
      try {
        log(`Received message: ${JSON.stringify(data)}`);

        const parsed = insertMessageSchema.safeParse({
          ...data,
          metadata: data.metadata || {},
          timestamp: new Date(data.timestamp || new Date().toISOString())
        });

        if (!parsed.success) {
          log(`Invalid message format: ${JSON.stringify(parsed.error)}`);
          socket.emit("message", {
            content: "Invalid message format",
            role: "system",
            metadata: { 
              error: true,
              validationError: parsed.error.errors
            },
            timestamp: new Date(),
          });
          return;
        }

        const savedMessage = await storage.addMessage(parsed.data);
        const response = await agentManager.handleMessage(savedMessage);

        // Emit the user's message first
        io.emit("message", savedMessage);

        if (response) {
          const savedResponse = await storage.addMessage(response);
          log(`Sending AI response: ${JSON.stringify(savedResponse)}`);
          io.emit("message", savedResponse);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Socket.IO error: ${errorMessage}`);
        socket.emit("message", {
          content: "An error occurred while processing your message",
          role: "system",
          metadata: { 
            error: true,
            errorMessage: errorMessage
          },
          timestamp: new Date(),
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