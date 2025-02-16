import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertAgentSchema } from "@shared/schema";
import { AgentManager } from "./agents/agent";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const agentManager = new AgentManager(storage);

  app.get("/api/messages", async (_req, res) => {
    const messages = await storage.getMessages();
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const parsed = insertMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const message = await storage.addMessage(parsed.data);
    const response = await agentManager.handleMessage(message);
    if (response) {
      const savedResponse = await storage.addMessage(response);
      res.json([message, savedResponse]);
      return;
    }
    res.json([message]);
  });

  app.get("/api/agents", async (_req, res) => {
    const agents = await storage.getAgents();
    res.json(agents);
  });

  app.post("/api/agents", async (req, res) => {
    const parsed = insertAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }
    const agent = await storage.addAgent(parsed.data);
    res.json(agent);
  });

  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        const parsed = insertMessageSchema.safeParse({
          ...message,
          metadata: message.metadata || {},
        });

        if (parsed.success) {
          const savedMessage = await storage.addMessage(parsed.data);
          const response = await agentManager.handleMessage(savedMessage);

          // Broadcast the user message to all clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(savedMessage));
            }
          });

          // If there's a response, save and broadcast it
          if (response) {
            const savedResponse = await storage.addMessage(response);
            wss.clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(savedResponse));
              }
            });
          }
        }
      } catch (error) {
        console.error("WebSocket error:", error);
      }
    });
  });

  return httpServer;
}