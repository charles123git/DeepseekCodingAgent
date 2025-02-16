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
    try {
      log(`Received POST /api/messages with body: ${JSON.stringify(req.body)}`);
      const parsed = insertMessageSchema.safeParse({
        ...req.body,
        timestamp: new Date(req.body.timestamp)
      });
      if (!parsed.success) {
        log(`Invalid message format: ${JSON.stringify(parsed.error)}`);
        res.status(400).json({ error: parsed.error });
        return;
      }
      const message = await storage.addMessage(parsed.data);
      log(`Saved user message: ${JSON.stringify(message)}`);

      const response = await agentManager.handleMessage(message);
      log(`Agent response: ${JSON.stringify(response)}`);

      if (response) {
        const savedResponse = await storage.addMessage(response);
        log(`Saved AI response: ${JSON.stringify(savedResponse)}`);
        // Ensure both HTTP and WebSocket clients get the response
        io.emit("message", savedResponse);
        res.json([message, savedResponse]);
        return;
      }
      res.json([message]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Error in POST /api/messages: ${errorMessage}`);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  io.on("connection", (socket) => {
    log("New Socket.IO connection established");

    socket.on("message", async (data) => {
      try {
        log(`Received WebSocket message: ${JSON.stringify(data)}`);

        const parsed = insertMessageSchema.safeParse({
          ...data,
          metadata: data.metadata || {},
          timestamp: new Date(data.timestamp || new Date().toISOString())
        });

        if (!parsed.success) {
          log(`Invalid WebSocket message format: ${JSON.stringify(parsed.error)}`);
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
        log(`Saved WebSocket user message: ${JSON.stringify(savedMessage)}`);

        // Emit user message to all clients
        io.emit("message", savedMessage);

        const response = await agentManager.handleMessage(savedMessage);
        log(`WebSocket agent response: ${JSON.stringify(response)}`);

        if (response) {
          const savedResponse = await storage.addMessage(response);
          log(`Saved WebSocket AI response: ${JSON.stringify(savedResponse)}`);
          // Emit AI response to all clients
          io.emit("message", savedResponse);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`WebSocket error: ${errorMessage}`);
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