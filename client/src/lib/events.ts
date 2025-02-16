// Simple browser-compatible event emitter
export class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  emit(event: string, data?: any): void {
    const callbacks = this.events[event];
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  removeAllListeners(): void {
    this.events = {};
  }
}
