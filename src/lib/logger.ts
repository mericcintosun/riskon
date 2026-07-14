/**
 * Structured Logging System
 *
 * This module provides a comprehensive logging system that replaces console.log statements
 * throughout the codebase with structured, configurable logging that supports different
 * log levels, environments, and output formats.
 *
 * Features:
 * - Log levels (DEBUG, INFO, WARN, ERROR)
 * - Environment-aware logging (development vs production)
 * - Structured logging with metadata
 * - Performance monitoring
 * - Error tracking integration points
 * - Component/module-specific loggers
 */

// Log levels in order of severity
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

// Log entry interface
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  module?: string;
  metadata?: Record<string, any>;
  error?: Error;
  performance?: {
    duration?: number;
    operation?: string;
    startTime?: number;
  };
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStructuredOutput: boolean;
  enablePerformanceTracking: boolean;
  modules?: string[];
  redactSensitiveData: boolean;
  sensitiveFields?: string[];
}

// Default configuration
const DEFAULT_CONFIG: LoggerConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableStructuredOutput: process.env.NODE_ENV === 'production',
  enablePerformanceTracking: true,
  redactSensitiveData: true,
  sensitiveFields: ['password', 'secret', 'key', 'token', 'private', 'auth'],
};

/**
 * Main Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private performanceOperations: Map<string, number> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Create a module-specific logger
   */
  module(moduleName: string): ModuleLogger {
    return new ModuleLogger(this, moduleName);
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  /**
   * Redact sensitive data from log metadata
   */
  private redactSensitiveData(data: Record<string, any>): Record<string, any> {
    if (!this.config.redactSensitiveData) return data;

    const redacted = { ...data };
    const sensitivePatterns = this.config.sensitiveFields?.map(field => 
      new RegExp(field, 'i')
    ) || [];

    const redactValue = (obj: any, path: string = ''): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map((item, index) => redactValue(item, `${path}[${index}]`));
      }

      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Check if this field matches any sensitive pattern
        const isSensitive = sensitivePatterns.some(pattern => 
          pattern.test(key) || pattern.test(currentPath)
        );

        if (isSensitive && typeof value === 'string') {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          result[key] = redactValue(value, currentPath);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return redactValue(redacted);
  }

  /**
   * Format log entry for console output
   */
  private formatForConsole(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level].padEnd(5);
    const module = entry.module ? `[${entry.module}]` : '';
    
    let message = `${timestamp} ${level} ${module} ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      const safeMetadata = this.redactSensitiveData(entry.metadata);
      message += ` | ${JSON.stringify(safeMetadata)}`;
    }
    
    if (entry.error) {
      message += `\nError: ${entry.error.message}`;
      if (entry.error.stack) {
        message += `\nStack: ${entry.error.stack}`;
      }
    }
    
    if (entry.performance) {
      const { duration, operation } = entry.performance;
      if (duration !== undefined && operation) {
        message += ` | Performance: ${operation} took ${duration}ms`;
      }
    }
    
    return message;
  }

  /**
   * Output log entry to configured destinations
   */
  private output(entry: LogEntry): void {
    if (!this.shouldLog(entry.level)) return;

    // Console output
    if (this.config.enableConsole) {
      const formatted = this.formatForConsole(entry);
      
      switch (entry.level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
          console.error(formatted);
          break;
      }
    }

    // Structured output (for production monitoring)
    if (this.config.enableStructuredOutput) {
      // In production, this could be sent to a logging service
      // like Sentry, LogRocket, DataDog, etc.
      const structuredEntry = {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        metadata: entry.metadata ? this.redactSensitiveData(entry.metadata) : undefined,
      };
      
      // Integration point for external logging services
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        // sendToMonitoringService(structuredEntry);
      }
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      metadata,
      error,
    };
    
    this.output(entry);
  }

  /**
   * Public logging methods
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  /**
   * Performance tracking methods
   */
  startTimer(operation: string): string {
    if (!this.config.enablePerformanceTracking) return '';
    
    const timerId = `${operation}_${Date.now()}_${Math.random()}`;
    this.performanceOperations.set(timerId, performance.now());
    
    this.debug(`Timer started: ${operation}`, { timerId, operation });
    return timerId;
  }

  endTimer(timerId: string, operation: string, metadata?: Record<string, any>): void {
    if (!this.config.enablePerformanceTracking) return;
    
    const startTime = this.performanceOperations.get(timerId);
    if (!startTime) {
      this.warn(`Timer not found: ${timerId}`, { operation });
      return;
    }
    
    const duration = performance.now() - startTime;
    this.performanceOperations.delete(timerId);
    
    const entry: LogEntry = {
      level: LogLevel.DEBUG,
      message: `Timer completed: ${operation}`,
      timestamp: new Date(),
      metadata,
      performance: { duration, operation, startTime },
    };
    
    this.output(entry);
  }

  /**
   * Convenience method for timing operations
   */
  async time<T>(
    operation: string, 
    fn: () => Promise<T> | T, 
    metadata?: Record<string, any>
  ): Promise<T> {
    const timerId = this.startTimer(operation);
    
    try {
      const result = await fn();
      this.endTimer(timerId, operation, { ...metadata, success: true });
      return result;
    } catch (error) {
      this.endTimer(timerId, operation, { ...metadata, success: false });
      this.error(`Operation failed: ${operation}`, error as Error, metadata);
      throw error;
    }
  }
}

/**
 * Module-specific logger
 */
export class ModuleLogger {
  private logger: Logger;
  private moduleName: string;

  constructor(logger: Logger, moduleName: string) {
    this.logger = logger;
    this.moduleName = moduleName;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, any>, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      module: this.moduleName,
      metadata,
      error,
    };
    
    this.logger['output'](entry);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error);
  }

  startTimer(operation: string): string {
    return this.logger.startTimer(`${this.moduleName}:${operation}`);
  }

  endTimer(timerId: string, operation: string, metadata?: Record<string, any>): void {
    this.logger.endTimer(timerId, `${this.moduleName}:${operation}`, metadata);
  }

  async time<T>(
    operation: string, 
    fn: () => Promise<T> | T, 
    metadata?: Record<string, any>
  ): Promise<T> {
    return this.logger.time(`${this.moduleName}:${operation}`, fn, metadata);
  }
}

// Default logger instance
export const logger = new Logger();

// Convenience exports for backward compatibility
export const log = {
  debug: (message: string, metadata?: Record<string, any>) => logger.debug(message, metadata),
  info: (message: string, metadata?: Record<string, any>) => logger.info(message, metadata),
  warn: (message: string, metadata?: Record<string, any>) => logger.warn(message, metadata),
  error: (message: string, error?: Error, metadata?: Record<string, any>) => logger.error(message, error, metadata),
  time: <T>(operation: string, fn: () => Promise<T> | T, metadata?: Record<string, any>) => 
    logger.time(operation, fn, metadata),
};

// Export module-specific loggers for common modules
export const createLogger = (moduleName: string) => logger.module(moduleName);

// Pre-configured module loggers
export const loggers = {
  riskTier: createLogger('RiskTier'),
  cache: createLogger('Cache'),
  validation: createLogger('Validation'),
  api: createLogger('API'),
  stellar: createLogger('Stellar'),
  performance: createLogger('Performance'),
  security: createLogger('Security'),
};
