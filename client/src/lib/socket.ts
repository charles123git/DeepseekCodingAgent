import { io, type Socket } from "socket.io-client";
import { log } from "@/lib/utils";
import { EventEmitter } from "./events";
import { z } from "zod";

// Message validation schema - keep in sync with server
const MessageSchema = z.object({
  content: z.string().min(1, "Message content cannot be empty"),
  role: z.enum(["user", "assistant", "system"]),
  metadata: z.record(z.unknown()).optional(),
});

interface SocketConfig {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  healthCheckInterval?: number;
  connectionTimeout?: number;
}

const DEFAULT_CONFIG: Required<SocketConfig> = {
  maxRetries: 3,
  initialRetryDelay: 1000,
  maxRetryDelay: 5000,
  healthCheckInterval: 30000,
  connectionTimeout: 5000,
};

export class SocketManager extends EventEmitter {
  private socket: Socket | null = null;
  private config: Required<SocketConfig>;
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private isCleanedUp: boolean = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectAttempts: number = 0;

  constructor(config: SocketConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  connect(): void {
    if (this.isCleanedUp || this.socket?.connected) {
      log("Connection attempt blocked - cleanup flag or already connected", { 
        level: 'warn',
        context: { 
          cleaned: this.isCleanedUp,
          connected: this.socket?.connected
        }
      });
      return;
    }

    this.cleanup(false);
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (this.isCleanedUp) return;

    try {
      this.connectionState = 'connecting';
      const socketUrl = import.meta.env.PROD 
        ? window.location.origin
        : `${window.location.protocol}//${window.location.hostname}:5000`;

      log("Initializing WebSocket connection", { 
        level: 'info',
        context: { url: socketUrl }
      });

      this.socket = io(socketUrl, {
        path: "/ws",
        reconnectionAttempts: this.config.maxRetries,
        reconnectionDelay: this.config.initialRetryDelay,
        timeout: this.config.connectionTimeout,
        transports: ['websocket', 'polling'],
        forceNew: true,
        autoConnect: true
      });

      this.setupEventHandlers();
      this.setupHealthCheck();
      this.emitStateChange();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private setupHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      if (this.socket?.connected) {
        const startTime = Date.now();
        this.socket.emit('ping');
        this.socket.once('pong', () => {
          const latency = Date.now() - startTime;
          log("Health check successful", {
            level: 'debug',
            context: { latency }
          });
        });
      }
    }, this.config.healthCheckInterval);
  }

  private setupEventHandlers(): void {
    if (!this.socket || this.isCleanedUp) return;

    this.socket.on('connect', () => {
      if (this.isCleanedUp) {
        this.socket?.disconnect();
        return;
      }

      this.reconnectAttempts = 0;
      log("Socket.IO connection established", { level: 'info' });
      this.connectionState = 'connected';
      this.emitStateChange();
    });

    this.socket.on('disconnect', (reason) => {
      log("Socket.IO connection closed", { 
        level: 'info',
        context: { reason }
      });
      this.connectionState = 'disconnected';
      this.emitStateChange();

      // Handle reconnection for specific disconnect reasons
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, retry connection
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      this.handleConnectionError(error);

      if (this.reconnectAttempts >= this.config.maxRetries) {
        log("Max reconnection attempts reached", {
          level: 'error',
          context: { attempts: this.reconnectAttempts }
        });
        this.cleanup(true);
      }
    });

    this.socket.on('error', (error) => {
      log("Socket error received", {
        level: 'error',
        context: { error }
      });
      this.emit('error', error);
    });

    this.socket.on('message', (data) => {
      if (this.isCleanedUp) return;

      try {
        const validatedMessage = MessageSchema.parse(data);
        this.emit('message', validatedMessage);
        log("Processed incoming message", { 
          level: 'debug',
          context: { messageType: validatedMessage.role }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log("Message validation error", { 
          level: 'error',
          context: { error: errorMessage }
        });
      }
    });
  }

  private handleConnectionError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("Socket.IO error occurred", { 
      level: 'error',
      context: { 
        error: errorMessage,
        attempts: this.reconnectAttempts
      }
    });
    this.connectionState = 'disconnected';
    this.emitStateChange();
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.connectionState);
  }

  send(message: string): void {
    if (!this.socket?.connected) {
      log("Message not sent - connection not ready", { 
        level: 'warn',
        context: { connectionState: this.connectionState }
      });
      throw new Error("Socket not connected");
    }

    try {
      const data = JSON.parse(message);
      const validatedMessage = MessageSchema.parse(data);
      this.socket.emit('message', validatedMessage);
      log("Message sent successfully", { 
        level: 'debug',
        context: { messageType: validatedMessage.role }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log("Message validation failed", {
        level: 'error',
        context: { error: errorMessage }
      });
      throw new Error(`Invalid message format: ${errorMessage}`);
    }
  }

  cleanup(fullCleanup: boolean = true): void {
    log("Cleaning up Socket manager", { 
      level: 'info',
      context: { fullCleanup }
    });

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (fullCleanup) {
      this.isCleanedUp = true;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionState = 'disconnected';
    this.emitStateChange();

    if (fullCleanup) {
      this.removeAllListeners();
    }
  }

  getState(): string {
    return this.connectionState;
  }
}

export function createSocket(config?: SocketConfig): SocketManager {
  const manager = new SocketManager(config);
  manager.connect();
  return manager;
}