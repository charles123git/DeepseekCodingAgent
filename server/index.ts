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

  // Initialize Socket.IO before any other middleware
  const io = new Server(server, {
    path: '/ws',
    cors: {
      origin: true,
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
    connectTimeout: 45000,
  });

  // Socket.IO middleware for logging
  io.use((socket, next) => {
    log(`New socket connection attempt from ${socket.handshake.address}`);
    next();
  });

  // Handle Socket.IO connections
  io.on('connection', (socket) => {
    log(`Client connected: ${socket.id}`);

    socket.on('message', (data) => {
      try {
        const validatedMessage = MessageSchema.parse(data);
        log(`Received message from ${socket.id}`);

        // Broadcast to all clients except sender
        socket.broadcast.emit('message', validatedMessage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log(`Message validation error: ${errorMessage}`);
        socket.emit('error', {
          type: 'validation_error',
          message: errorMessage
        });
      }
    });

    socket.on('disconnect', (reason) => {
      log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      log(`Socket error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    });
  });

  // Setup Vite or static file serving
  if (process.env.NODE_ENV === 'development') {
    log('Starting in development mode with Vite middleware');
    await setupVite(app, server);
  } else {
    log('Starting in production mode with static file serving');
    serveStatic(app);
  }

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    log(`Global error handler: ${message} (${status})`);
    res.status(status).json({ message });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
  });
})();