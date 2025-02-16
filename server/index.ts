import express, { type Request, Response, NextFunction } from "express";
import { Server } from "socket.io";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { z } from "zod";

// Message validation schema
const MessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  role: z.enum(["user", "assistant", "system"]),
  metadata: z.record(z.unknown()).optional(),
});

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create HTTP server first
  const server = await registerRoutes(app);

  // Skip WebSocket handling for non-ws paths
  app.use((req, res, next) => {
    if (!req.url?.startsWith('/ws')) {
      return next();
    }
    // Let Socket.IO handle WebSocket requests
    return next('route');
  });

  // Initialize Socket.IO with enhanced configuration
  const io = new Server(server, {
    path: '/ws',
    cors: {
      origin: true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    connectTimeout: 45000,
    pingTimeout: 10000,
    pingInterval: 5000,
    transports: ['websocket', 'polling']
  });

  // Track connected clients
  const connectedClients = new Set<string>();

  // Handle Socket.IO connections with improved error handling
  io.on('connection', (socket) => {
    connectedClients.add(socket.id);
    log(`Client connected: ${socket.id}. Total clients: ${connectedClients.size}`);

    socket.on('message', (data) => {
      try {
        // Validate incoming message
        const validatedMessage = MessageSchema.parse(data);
        log(`Received message from client ${socket.id}`);

        // Broadcast validated message to all clients except sender
        socket.broadcast.emit('message', validatedMessage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Message validation error from ${socket.id}: ${errorMessage}`);

        // Send error back to the client
        socket.emit('error', {
          type: 'validation_error',
          message: errorMessage
        });
      }
    });

    socket.on('disconnect', (reason) => {
      connectedClients.delete(socket.id);
      log(`Client disconnected: ${socket.id}. Reason: ${reason}. Remaining clients: ${connectedClients.size}`);
    });

    socket.on('error', (error) => {
      log(`Socket error for ${socket.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });

    // Implement ping/pong for connection health check
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Global error handler: ${message} (${status})`);
    res.status(status).json({ message });
  });

  // Setup Vite AFTER Socket.IO initialization
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    log(`Server running on port ${PORT}`);
  });
})();