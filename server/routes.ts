import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertMessageSchema, insertAgentSchema } from "@shared/schema";
import { AgentManager } from "./agents/agent";
import { log } from "./vite";

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
    log("New WebSocket connection established");

    // Send initial pong to establish connection health
    ws.send(JSON.stringify({ type: 'pong' }));

    ws.on("message", async (data) => {
      try {
        const rawMessage = data.toString();
        const message = JSON.parse(rawMessage);
        log(`Received message: ${rawMessage}`);

        // Handle ping messages
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        const parsed = insertMessageSchema.safeParse({
          ...message,
          metadata: message.metadata || {},
        });

        if (!parsed.success) {
          log(`Invalid message format: ${JSON.stringify(parsed.error)}`);
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              content: "Invalid message format",
              role: "system",
              metadata: { 
                error: true,
                validationError: parsed.error.errors
              },
              timestamp: new Date().toISOString(),
            }));
          }
          return;
        }

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
          log(`Sending AI response: ${JSON.stringify(savedResponse)}`);
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(savedResponse));
            }
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`WebSocket error: ${errorMessage}`);
        // Send error message back to the client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            content: "An error occurred while processing your message",
            role: "system",
            metadata: { 
              error: true,
              errorMessage: errorMessage
            },
            timestamp: new Date().toISOString(),
          }));
        }
      }
    });

    ws.on("close", () => {
      log("WebSocket connection closed");
    });

    ws.on("error", (error) => {
      log(`WebSocket error: ${error}`);
    });
  });

  return httpServer;
}