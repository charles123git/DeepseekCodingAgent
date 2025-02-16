import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  level?: LogLevel;
  context?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CURRENT_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function log(message: string, options: LogOptions = {}): void {
  const { level = 'info', context = {} } = options;

  if (LOG_LEVELS[level] < LOG_LEVELS[CURRENT_LOG_LEVEL]) {
    return;
  }

  const timestamp = new Date().toISOString();
  const logData = {
    timestamp,
    level,
    message,
    ...context,
  };

  switch (level) {
    case 'error':
      console.error(JSON.stringify(logData));
      break;
    case 'warn':
      console.warn(JSON.stringify(logData));
      break;
    case 'debug':
      console.debug(JSON.stringify(logData));
      break;
    default:
      console.log(JSON.stringify(logData));
  }
}

// Circuit breaker implementation
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