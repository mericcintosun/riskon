/**
 * Logger Test Suite
 *
 * Comprehensive tests for the structured logging system
 */

import { Logger, ModuleLogger, LogLevel, logger, loggers, log, createLogger } from '../logger';

// Mock console methods
const mockConsole = {
  debug: jest.spyOn(console, 'debug').mockImplementation(),
  info: jest.spyOn(console, 'info').mockImplementation(),
  warn: jest.spyOn(console, 'warn').mockImplementation(),
  error: jest.spyOn(console, 'error').mockImplementation(),
};

// Mock performance.now
const mockPerformanceNow = jest.spyOn(performance, 'now');

// Restore the real console/performance implementations only once, after the
// entire suite has finished. Restoring between individual tests would detach
// these module-level spies for every subsequent test (leaving them unable to
// record calls); clearing them in each beforeEach is enough to isolate tests.
afterAll(() => {
  jest.restoreAllMocks();
});

describe('Logger', () => {
  let testLogger: Logger;

  beforeEach(() => {
    jest.clearAllMocks();
    testLogger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableStructuredOutput: false,
      enablePerformanceTracking: true,
    });
  });

  describe('Basic Logging', () => {
    test('should log debug messages', () => {
      testLogger.debug('Debug message', { key: 'value' });
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringMatching(/DEBUG\s+Debug message/)
      );
    });

    test('should log info messages', () => {
      testLogger.info('Info message');
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringMatching(/INFO\s+Info message/)
      );
    });

    test('should log warn messages', () => {
      testLogger.warn('Warning message');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        expect.stringMatching(/WARN\s+Warning message/)
      );
    });

    test('should log error messages', () => {
      const error = new Error('Test error');
      testLogger.error('Error message', error);
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringMatching(/ERROR\s+Error message/)
      );
      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: Test error')
      );
    });

    test('should respect log levels', () => {
      testLogger.setLevel(LogLevel.WARN);
      
      testLogger.debug('Debug message');
      testLogger.info('Info message');
      testLogger.warn('Warning message');
      testLogger.error('Error message');
      
      expect(mockConsole.debug).not.toHaveBeenCalled();
      expect(mockConsole.info).not.toHaveBeenCalled();
      expect(mockConsole.warn).toHaveBeenCalled();
      expect(mockConsole.error).toHaveBeenCalled();
    });
  });

  describe('Module Logging', () => {
    test('should create module-specific loggers', () => {
      const moduleLogger = testLogger.module('TestModule');
      expect(moduleLogger).toBeInstanceOf(ModuleLogger);
    });

    test('should include module name in logs', () => {
      const moduleLogger = testLogger.module('TestModule');
      moduleLogger.info('Module message');
      
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[TestModule] Module message')
      );
    });
  });

  describe('Performance Tracking', () => {
    test('should track operation timing', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(250);

      const result = await testLogger.time('test-operation', async () => {
        return 'test-result';
      });

      expect(result).toBe('test-result');
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer completed: test-operation')
      );
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('took 150ms')
      );
    });

    test('should handle failed operations', async () => {
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(200);

      const error = new Error('Operation failed');
      
      await expect(
        testLogger.time('failing-operation', async () => {
          throw error;
        })
      ).rejects.toThrow('Operation failed');

      expect(mockConsole.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation failed: failing-operation')
      );
      // The timer duration is emitted by endTimer at DEBUG level (console.debug),
      // not by the error log above.
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('took 100ms')
      );
    });

    test('should support manual timer management', () => {
      // Mocks must be queued before startTimer, which captures the start time.
      mockPerformanceNow
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(300);

      const timerId = testLogger.startTimer('manual-operation');
      expect(typeof timerId).toBe('string');
      expect(timerId.length).toBeGreaterThan(0);

      testLogger.endTimer(timerId, 'manual-operation');

      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('Timer completed: manual-operation')
      );
      expect(mockConsole.debug).toHaveBeenCalledWith(
        expect.stringContaining('took 200ms')
      );
    });
  });

  describe('Data Redaction', () => {
    test('should redact sensitive data', () => {
      const redactingLogger = new Logger({
        level: LogLevel.DEBUG,
        enableConsole: true,
        redactSensitiveData: true,
        sensitiveFields: ['password', 'secret'],
      });

      redactingLogger.info('Login attempt', {
        username: 'testuser',
        password: 'secret123',
        apiKey: 'abc123',
        userSecret: 'hidden',
      });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED]')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.not.stringContaining('secret123')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.not.stringContaining('hidden')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('testuser')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('abc123')
      );
    });

    test('should handle nested object redaction', () => {
      // Redaction matches on the field *key* (case-insensitive substring):
      // 'auth' matches the nested `authorization` header, 'token' matches the
      // nested `userToken` field.
      const redactingLogger = new Logger({
        level: LogLevel.DEBUG,
        enableConsole: true,
        redactSensitiveData: true,
        sensitiveFields: ['token', 'auth'],
      });

      redactingLogger.info('API call', {
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json',
        },
        body: {
          userToken: 'user-secret',
          publicData: 'visible',
        },
      });

      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.stringContaining('[REDACTED]')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.not.stringContaining('secret-token')
      );
      expect(mockConsole.info).toHaveBeenCalledWith(
        expect.not.stringContaining('user-secret')
      );
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      const defaultLogger = new Logger();
      expect(defaultLogger['config'].level).toBe(
        process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG
      );
    });

    test('should merge custom configuration', () => {
      const customLogger = new Logger({
        level: LogLevel.ERROR,
        enableConsole: false,
      });

      expect(customLogger['config'].level).toBe(LogLevel.ERROR);
      expect(customLogger['config'].enableConsole).toBe(false);
      // Default value: DEFAULT_CONFIG derives this from NODE_ENV (production only).
      expect(customLogger['config'].enableStructuredOutput).toBe(
        process.env.NODE_ENV === 'production'
      );
    });
  });
});

describe('ModuleLogger', () => {
  let moduleLogger: ModuleLogger;

  beforeEach(() => {
    jest.clearAllMocks();
    moduleLogger = new ModuleLogger(logger, 'TestModule');
  });

  test('should log with module prefix', () => {
    moduleLogger.info('Module message');
    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('[TestModule] Module message')
    );
  });

  test('should track performance with module prefix', async () => {
    mockPerformanceNow
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(200);

    await moduleLogger.time('module-operation', async () => {
      return 'result';
    });

    expect(mockConsole.debug).toHaveBeenCalledWith(
      expect.stringContaining('Timer completed: TestModule:module-operation')
    );
  });
});

describe('Convenience Exports', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should provide global logger instance', () => {
    expect(logger).toBeInstanceOf(Logger);
  });

  test('should provide convenience log object', () => {
    log.debug('Debug test');
    expect(mockConsole.debug).toHaveBeenCalled();

    log.info('Info test');
    expect(mockConsole.info).toHaveBeenCalled();

    log.warn('Warn test');
    expect(mockConsole.warn).toHaveBeenCalled();

    log.error('Error test');
    expect(mockConsole.error).toHaveBeenCalled();
  });

  test('should provide pre-configured module loggers', () => {
    expect(loggers.riskTier).toBeInstanceOf(ModuleLogger);
    expect(loggers.cache).toBeInstanceOf(ModuleLogger);
    expect(loggers.validation).toBeInstanceOf(ModuleLogger);
    expect(loggers.api).toBeInstanceOf(ModuleLogger);
    expect(loggers.stellar).toBeInstanceOf(ModuleLogger);
    expect(loggers.performance).toBeInstanceOf(ModuleLogger);
    expect(loggers.security).toBeInstanceOf(ModuleLogger);
  });

  test('should create logger function', () => {
    const customLogger = createLogger('CustomModule');
    expect(customLogger).toBeInstanceOf(ModuleLogger);
  });
});

describe('Integration Tests', () => {
  test('should handle complex logging scenarios', () => {
    // DEBUG level so the timer's DEBUG-level completion log is emitted.
    const complexLogger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enablePerformanceTracking: true,
      redactSensitiveData: true,
    });

    // Queue timing before startTimer captures the start time.
    mockPerformanceNow
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(500);

    // Simulate a complex operation
    const timerId = complexLogger.startTimer('complex-operation');

    complexLogger.info('Starting complex operation', {
      operationId: '12345',
      userId: 'user123',
      parameters: { secret: 'hidden', public: 'visible' },
    });

    complexLogger.endTimer(timerId, 'complex-operation', {
      result: 'success',
      recordsProcessed: 1000,
    });

    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('Starting complex operation')
    );
    expect(mockConsole.info).toHaveBeenCalledWith(
      expect.stringContaining('[REDACTED]')
    );
    expect(mockConsole.info).not.toHaveBeenCalledWith(
      expect.stringContaining('hidden')
    );
    expect(mockConsole.debug).toHaveBeenCalledWith(
      expect.stringContaining('Timer completed: complex-operation')
    );
    expect(mockConsole.debug).toHaveBeenCalledWith(
      expect.stringContaining('took 400ms')
    );
  });

  test('should handle error scenarios with metadata', () => {
    const errorLogger = new Logger({ level: LogLevel.DEBUG });
    
    const error = new Error('Database connection failed');
    error.stack = 'Error: Database connection failed\n    at Connection.connect';

    errorLogger.error('Failed to connect to database', error, {
      database: 'postgresql',
      host: 'localhost',
      port: 5432,
      attempts: 3,
    });

    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringMatching(/ERROR\s+Failed to connect to database/)
    );
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('Error: Database connection failed')
    );
    expect(mockConsole.error).toHaveBeenCalledWith(
      expect.stringContaining('Stack: Error: Database connection failed')
    );
  });
});
