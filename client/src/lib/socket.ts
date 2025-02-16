import { io, type Socket } from "socket.io-client";
import { log } from "@/lib/utils";
import { EventEmitter } from "./events";

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
        : `${window.location.protocol}//${window.location.host}`;

      this.socket = io(socketUrl, {
        path: "/ws",
        reconnectionAttempts: this.config.maxRetries,
        reconnectionDelay: this.config.initialRetryDelay,
        timeout: this.config.connectionTimeout,
      });

      this.setupEventHandlers();
      this.emitStateChange();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.socket || this.isCleanedUp) return;

    this.socket.on('connect', () => {
      if (this.isCleanedUp) {
        this.socket?.disconnect();
        return;
      }

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
    });

    this.socket.on('connect_error', (error) => {
      this.handleConnectionError(error);
    });

    this.socket.on('message', (data) => {
      if (this.isCleanedUp) return;

      try {
        this.emit('message', data);
        log("Processed incoming message", { 
          level: 'debug',
          context: { messageType: data.type }
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        log("Error handling Socket.IO message", { 
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
      context: { error: errorMessage }
    });
    this.connectionState = 'disconnected';
    this.emitStateChange();
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.connectionState);
  }

  send(message: string): void {
    if (this.socket?.connected) {
      this.socket.emit('message', JSON.parse(message));
      log("Message sent", { level: 'debug' });
    } else {
      log("Message not sent - connection not ready", { 
        level: 'warn',
        context: { 
          connectionState: this.connectionState 
        }
      });
    }
  }

  cleanup(fullCleanup: boolean = true): void {
    log("Cleaning up Socket manager", { 
      level: 'info',
      context: { fullCleanup }
    });

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