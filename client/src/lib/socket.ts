import { log, CircuitBreaker } from "@/lib/utils";
import { EventEmitter } from "events";

interface WebSocketConfig {
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  healthCheckInterval?: number;
  connectionTimeout?: number;
}

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  maxRetries: 5,
  initialRetryDelay: 1000,
  maxRetryDelay: 30000,
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

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.retryDelay = this.config.initialRetryDelay;
    this.circuitBreaker = new CircuitBreaker();
  }

  connect(): void {
    if (this.circuitBreaker.isOpen()) {
      log("Circuit breaker is open, delaying connection attempt", { 
        level: 'warn',
        context: { state: this.circuitBreaker.getState() } 
      });
      return;
    }

    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.cleanup();
    this.initializeConnection();
  }

  private initializeConnection(): void {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      this.connectionState = 'connecting';
      this.socket = new WebSocket(wsUrl);

      this.setupConnectionHandlers();
      this.setupConnectionTimeout();
      this.setupHealthCheck();
      this.emitStateChange();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      log("WebSocket connection established", { level: 'info' });
      this.connectionState = 'connected';
      this.circuitBreaker.recordSuccess();
      this.retryCount = 0;
      this.retryDelay = this.config.initialRetryDelay;
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
      if (event.data === 'pong') {
        this.lastPongTime = Date.now();
        return;
      }
      this.handleMessage(event);
    };
  }

  private setupConnectionTimeout(): void {
    setTimeout(() => {
      if (this.socket?.readyState !== WebSocket.OPEN) {
        log("WebSocket connection timeout", { level: 'warn' });
        this.socket?.close();
        this.handleReconnection();
      }
    }, this.config.connectionTimeout);
  }

  private setupHealthCheck(): void {
    this.healthCheckInterval = window.setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send('ping');

        // Check if we've missed too many pongs
        if (Date.now() - this.lastPongTime > this.config.healthCheckInterval * 2) {
          log("Health check failed - no pong received", { level: 'warn' });
          this.socket.close();
        }
      }
    }, this.config.healthCheckInterval);
  }

  private handleClose(event: CloseEvent): void {
    this.connectionState = 'disconnected';
    log(`WebSocket connection closed: ${event.code} ${event.reason}`, { 
      level: 'info',
      context: { code: event.code, reason: event.reason }
    });
    this.emitStateChange();

    // Don't reconnect if it was a normal closure
    if (event.code !== 1000) {
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
    if (this.retryCount >= this.config.maxRetries) {
      log("Maximum WebSocket reconnection attempts reached", { level: 'error' });
      return;
    }

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    const delay = Math.min(this.retryDelay + jitter, this.config.maxRetryDelay);

    this.reconnectTimeout = window.setTimeout(() => {
      this.retryCount++;
      this.retryDelay *= 2; // Exponential backoff
      log(`Attempting WebSocket reconnection ${this.retryCount}/${this.config.maxRetries}`, { 
        level: 'info',
        context: { attempt: this.retryCount, delay }
      });
      this.connect();
    }, delay);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      this.emit('message', data);
      log("Received message", { level: 'debug', context: { data } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      log("Error parsing WebSocket message", { 
        level: 'error',
        context: { error: errorMessage }
      });
    }
  }

  private emitStateChange(): void {
    this.emit('stateChange', this.connectionState);
  }

  send(message: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      // Queue message if connection is not ready
      this.messageQueue.push(message);
      log("Message queued - connection not ready", { 
        level: 'warn',
        context: { queueLength: this.messageQueue.length }
      });
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(message);
      }
    }
  }

  cleanup(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.reconnectTimeout) {
      window.clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.healthCheckInterval) {
      window.clearInterval(this.healthCheckInterval);
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

// Export a factory function for creating WebSocket instances
export function createWebSocket(config?: WebSocketConfig): WebSocketManager {
  const manager = new WebSocketManager(config);
  manager.connect();
  return manager;
}