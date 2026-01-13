import type { WorkflowNode, LogEntry, LogLevel, WorkflowObserver } from '../types/index.js';
import { generateId } from '../utils/id.js';

/**
 * Logger that emits log entries to workflow node and observers
 */
export class WorkflowLogger {
  private readonly parentLogId?: string;

  constructor(
    private readonly node: WorkflowNode,
    private readonly observers: WorkflowObserver[],
    parentLogId?: string
  ) {
    this.parentLogId = parentLogId;
  }

  /**
   * Emit a log entry directly to the node without notifying observers
   * Used to avoid infinite recursion when observer.onLog() throws
   */
  private emitWithoutObserverNotification(entry: LogEntry): void {
    this.node.logs.push(entry);
  }

  /**
   * Emit a log entry to the node and all observers
   */
  private emit(entry: LogEntry): void {
    this.node.logs.push(entry);
    for (const obs of this.observers) {
      try {
        obs.onLog(entry);
      } catch (err) {
        // Create error entry and emit without observer notification to avoid infinite recursion
        const errorEntry: LogEntry = {
          id: generateId(),
          workflowId: this.node.id,
          timestamp: Date.now(),
          level: 'error',
          message: 'Observer onLog error',
          data: { error: err },
        };
        this.emitWithoutObserverNotification(errorEntry);
      }
    }
  }

  /**
   * Create a log entry with the given level
   */
  private log(level: LogLevel, message: string, data?: unknown): void {
    const entry: LogEntry = {
      id: generateId(),
      workflowId: this.node.id,
      timestamp: Date.now(),
      level,
      message,
      data,
    };

    // Add parent log ID if this is a child logger
    if (this.parentLogId) {
      entry.parentLogId = this.parentLogId;
    }

    this.emit(entry);
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  /**
   * Log an error message
   */
  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  /**
   * Create a child logger that includes parentLogId
   * @param parentLogId - ID of the parent log entry (legacy API)
   */
  child(parentLogId: string): WorkflowLogger;
  /**
   * Create a child logger with metadata
   * @param meta - Partial log entry metadata (typically { parentLogId: string })
   */
  child(meta: Partial<LogEntry>): WorkflowLogger;
  child(input: string | Partial<LogEntry>): WorkflowLogger {
    const parentLogId = typeof input === 'string' ? input : input.parentLogId;
    return new WorkflowLogger(this.node, this.observers, parentLogId);
  }
}
