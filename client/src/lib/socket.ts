import { log, CircuitBreaker } from "@/lib/utils";
import { EventEmitter } from "./events";

interface WebSocketConfig {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  healthCheckInterval?: number;
  connectionTimeout?: number;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  maxRetries: 1,
  initialRetryDelay: 1000,
  maxRetryDelay: 2000,
  healthCheckInterval: 30000,
  connectionTimeout: 5000,
};

export class WebSocketManager extends EventEmitter {
  private socket: WebSocket | null = null;
  private retryCount = 0;
  private retryDelay: number;
  private reconnectTimeout: number | null = null;
  private healthCheckInterval: number | null = null;
  private lastPongTime: number = Date.now();
  private circuitBreaker: CircuitBreaker;
  private messageQueue: string[] = [];
  private readonly config: Required<WebSocketConfig>;
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';
  private isCleanedUp: boolean = false;

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.retryDelay = this.config.initialRetryDelay;
    this.circuitBreaker = new CircuitBreaker(3, 5000); // More conservative circuit breaker
  }

  connect(): void {
    if (this.isCleanedUp) {
      log("Connection attempt blocked - cleanup flag is set", { 
        level: 'warn',
        context: { cleaned: this.isCleanedUp }
      });
      return;
    }

    if (this.circuitBreaker.isOpen()) {
      log("Connection attempt blocked - circuit breaker is open", { 
        level: 'warn',
        context: { state: this.circuitBreaker.getState() }
      });
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      log("WebSocket already connected", { level: 'info' });
      return;
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      log("WebSocket connection already in progress", { level: 'info' });
      return;
    }

    this.cleanup();
    this.initializeConnection();
  }

  private initializeConnection(): void {
    if (this.isCleanedUp) return;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      log("Initializing WebSocket connection", { 
        level: 'info',
        context: { url: wsUrl }
      });

      this.connectionState = 'connecting';
      this.socket = new WebSocket(wsUrl);
      this.setupConnectionHandlers();
      this.setupConnectionTimeout();
      this.emitStateChange();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.socket || this.isCleanedUp) return;

    this.socket.onopen = () => {
      if (this.isCleanedUp) {
        this.socket?.close();
        return;
      }

      log("WebSocket connection established", { level: 'info' });
      this.connectionState = 'connected';
      this.circuitBreaker.recordSuccess();
      this.retryCount = 0;
      this.retryDelay = this.config.initialRetryDelay;
      this.setupHealthCheck();
      this.flushMessageQueue();
      this.emitStateChange();
    };

    this.socket.onclose = (event) => {
      this.handleClose(event);
    };

    this.socket.onerror = (error) => {
      this.handleConnectionError(error);
    };

    this.socket.onmessage = (event) => {
      if (this.isCleanedUp) return;

      if (event.data === 'pong') {
        this.lastPongTime = Date.now();
        return;
      }
      this.handleMessage(event);
    };
  }

  private setupConnectionTimeout(): void {
    if (this.isCleanedUp) return;

    setTimeout(() => {
      if (this.socket?.readyState === WebSocket.CONNECTING) {
        log("WebSocket connection timeout", { level: 'warn' });
        this.socket.close();
      }
    }, this.config.connectionTimeout);
  }

  private setupHealthCheck(): void {
    if (this.isCleanedUp || this.healthCheckInterval) return;

    this.healthCheckInterval = window.setInterval(() => {
      if (this.isCleanedUp) {
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
          this.healthCheckInterval = null;
        }
        return;
      }

      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');

        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > this.config.healthCheckInterval * 2) {
          log("Health check failed - no pong received", { 
            level: 'warn',
            context: { timeSinceLastPong }
          });
          this.socket.close();
        }
      }
    }, this.config.healthCheckInterval);
  }

  private handleClose(event: CloseEvent): void {
    log("WebSocket connection closed", { 
      level: 'info',
      context: { 
        code: event.code,
        reason: event.reason || 'No reason provided',
        wasClean: event.wasClean
      }
    });

    this.connectionState = 'disconnected';
    this.emitStateChange();

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (!event.wasClean && !this.isCleanedUp) {
      this.handleReconnection();
    }
  }

  private handleConnectionError(error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log("WebSocket error occurred", { 
      level: 'error',
      context: { error: errorMessage }
    });
    this.circuitBreaker.recordFailure();
    this.connectionState = 'disconnected';
    this.emitStateChange();
  }

  private handleReconnection(): void {
    if (this.retryCount >= this.config.maxRetries || this.isCleanedUp) {
      log("Maximum WebSocket reconnection attempts reached or cleanup", { level: 'warn' });
      return;
    }

    const jitter = Math.random() * 200; // Reduced jitter
    const delay = Math.min(this.retryDelay + jitter, this.config.maxRetryDelay);

    log("Scheduling WebSocket reconnection", { 
      level: 'info',
      context: { 
        attempt: this.retryCount + 1,
        maxAttempts: this.config.maxRetries,
        delay
      }
    });

    this.reconnectTimeout = window.setTimeout(() => {
      this.retryCount++;
      this.retryDelay *= 2;
      this.connect();
    }, delay);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log("Error parsing WebSocket message", { 
        level: 'error',
        context: { error: errorMessage, rawData: event.data }
      });
    }
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.connectionState);
  }

  send(message: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
      log("Message sent", { level: 'debug' });
    } else {
      this.messageQueue.push(message);
      log("Message queued - connection not ready", { 
        level: 'warn',
        context: { 
          queueLength: this.messageQueue.length,
          connectionState: this.connectionState 
        }
      });
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.socket.send(message);
      }
    }
  }

  cleanup(): void {
    log("Cleaning up WebSocket manager", { level: 'info' });
    this.isCleanedUp = true;

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.connectionState = 'disconnected';
    this.emitStateChange();
    this.removeAllListeners();
  }

  getState(): string {
    return this.connectionState;
  }
}

export function createWebSocket(config?: WebSocketConfig): WebSocketManager {
  const manager = new WebSocketManager(config);
  manager.connect();
  return manager;
}