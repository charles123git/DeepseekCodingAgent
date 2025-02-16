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
  const server = await registerRoutes(app);

  // Initialize Socket.IO with enhanced configuration
  const io = new Server(server, {
    path: '/ws',
    cors: {
      origin: app.get('env') === 'production'
        ? false
        : ['http://localhost:5000', 'http://0.0.0.0:5000', 'http://127.0.0.1:5000'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 10000,
    pingInterval: 5000,
    transports: ['websocket', 'polling'],
    allowEIO3: true
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

        log(`Received message from client ${socket.id}`, {
          level: 'info',
          context: { messageType: validatedMessage.role }
        });

        // Broadcast validated message to all clients except sender
        socket.broadcast.emit('message', validatedMessage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Message validation error from ${socket.id}: ${errorMessage}`, {
          level: 'error'
        });

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
      log(`Socket error for ${socket.id}`, {
        level: 'error',
        context: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
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

    log(`Global error handler: ${message}`, {
      level: 'error',
      context: { status, stack: err.stack }
    });

    res.status(status).json({ message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`, { level: 'info' });
  });
})();