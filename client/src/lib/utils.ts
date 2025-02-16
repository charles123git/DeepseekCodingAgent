import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Simple browser-compatible logger
const logLevels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
} as const;

type LogLevel = keyof typeof logLevels;

const getLogPrefix = (level: LogLevel) => {
  const timestamp = new Date().toISOString();
  return `${timestamp} [${level.toUpperCase()}]`;
};

const shouldLog = (messageLevel: LogLevel) => {
  const currentLevel = import.meta.env.PROD ? logLevels.info : logLevels.debug;
  return logLevels[messageLevel] >= currentLevel;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const log = (message: string, options: { level?: LogLevel; context?: Record<string, unknown> } = {}) => {
  const { level = 'info', context = {} } = options;

  if (!shouldLog(level)) return;

  const prefix = getLogPrefix(level);
  const contextStr = Object.keys(context).length ? JSON.stringify(context) : '';
  const logMessage = `${prefix}: ${message} ${contextStr}`;

  switch (level) {
    case 'error':
      console.error(logMessage);
      break;
    case 'warn':
      console.warn(logMessage);
      break;
    case 'debug':
      console.debug(logMessage);
      break;
    default:
      console.log(logMessage);
  }
};

// Circuit breaker implementation for handling service failures
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000
  ) {}

  public isOpen(): boolean {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.timeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }
    return false;
  }

  public recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  public recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  public getState(): string {
    return this.state;
  }
}