# Structured Logging System Documentation

## Overview

This document describes the structured logging system implemented to replace console.log statements throughout the Riskon codebase. The new system provides better debugging capabilities, production-ready logging, and improved code maintainability.

## Features

### 1. Log Levels
- **DEBUG**: Detailed debugging information (development only)
- **INFO**: General information messages
- **WARN**: Warning messages for potential issues
- **ERROR**: Error messages with stack traces
- **SILENT**: No logging output

### 2. Environment-Aware Logging
- **Development**: All log levels enabled, detailed console output
- **Production**: INFO and above only, structured output format
- **Configurable**: Can be customized per environment

### 3. Structured Logging
- Metadata support for contextual information
- Automatic timestamping
- Module-specific loggers
- Error tracking integration points

### 4. Performance Tracking
- Built-in timer functionality
- Operation duration measurement
- Performance metrics collection

### 5. Security Features
- Sensitive data redaction
- Configurable sensitive field patterns
- Production-safe logging

## Usage

### Basic Logging

```typescript
import { log } from '@/lib/logger';

// Simple logging
log.info('User logged in');
log.error('API call failed', error);
log.warn('Rate limit approaching');
log.debug('Debug information', { userId, action });
```

### Module-Specific Logging

```typescript
import { loggers } from '@/lib/logger';

// Use pre-configured module loggers
loggers.riskTier.info('Risk tier updated', { userAddress, score });
loggers.cache.debug('Cache hit', { key, ttl });
loggers.validation.error('Validation failed', error, { field, value });
```

### Custom Module Logger

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('MyModule');
logger.info('Module initialized');
```

### Performance Tracking

```typescript
import { log } from '@/lib/logger';

// Manual timing
const timerId = log.startTimer('database-query');
// ... perform operation
log.endTimer(timerId, 'database-query', { rows: 100 });

// Automatic timing
const result = await log.time('api-call', async () => {
  return await fetchData();
}, { endpoint: '/users' });
```

## Configuration

### Default Configuration

```typescript
const defaultConfig = {
  level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableStructuredOutput: process.env.NODE_ENV === 'production',
  enablePerformanceTracking: true,
  redactSensitiveData: true,
  sensitiveFields: ['password', 'secret', 'key', 'token', 'private', 'auth'],
};
```

### Custom Configuration

```typescript
import { Logger } from '@/lib/logger';

const customLogger = new Logger({
  level: LogLevel.WARN,
  enableConsole: false,
  enableStructuredOutput: true,
  redactSensitiveData: true,
  sensitiveFields: ['apiKey', 'authToken'],
});
```

## Migration Guide

### From console.log

```typescript
// Before
console.log('User logged in', userId);
console.error('API error', error);

// After
log.info('User logged in', { userId });
log.error('API error', error);
```

### Migration Script

Use the migration script to automatically update console statements:

```bash
# Analyze files (dry run)
node scripts/migrate-logging.js

# Apply changes
node scripts/migrate-logging.js --apply
```

## Best Practices

### 1. Use Appropriate Log Levels
- **DEBUG**: Detailed debugging, temporary troubleshooting
- **INFO**: Important business events, state changes
- **WARN**: Recoverable issues, deprecation warnings
- **ERROR**: Unrecoverable errors, system failures

### 2. Include Contextual Metadata
```typescript
// Good
loggers.riskTier.info('Risk tier updated', {
  userAddress,
  score,
  tier,
  transactionHash,
});

// Less useful
log.info('Risk tier updated');
```

### 3. Use Module-Specific Loggers
```typescript
// Preferred
loggers.riskTier.info('Risk tier updated', metadata);

// Acceptable but less specific
log.info('Risk tier updated', metadata);
```

### 4. Handle Errors Properly
```typescript
try {
  await riskyOperation();
} catch (error) {
  loggers.api.error('Operation failed', error, { 
    operation: 'riskyOperation',
    userId 
  });
  throw error; // Re-throw if necessary
}
```

### 5. Performance Monitoring
```typescript
// For critical operations
const result = await loggers.performance.time('database-query', async () => {
  return await db.query(sql);
}, { queryType: 'SELECT' });

// For quick operations
const timerId = loggers.performance.startTimer('validation');
validateInput(data);
loggers.performance.endTimer(timerId, 'validation');
```

## Security Considerations

### Sensitive Data Redaction

The logging system automatically redacts sensitive data based on field patterns:

```typescript
// This will be redacted in logs
log.info('User login', {
  username: 'john_doe',
  password: 'secret123',  // -> [REDACTED]
  apiKey: 'abc123',      // -> [REDACTED]
});
```

### Custom Sensitive Fields

```typescript
const secureLogger = new Logger({
  sensitiveFields: ['password', 'secret', 'key', 'token', 'private', 'auth', 'ssn', 'creditCard'],
});
```

## Integration Points

### External Monitoring Services

The logging system includes integration points for external services:

```typescript
// In production, structured logs can be sent to:
// - Sentry for error tracking
// - LogRocket for user session monitoring  
// - DataDog for application monitoring
// - Custom logging endpoints
```

### Error Boundary Integration

```typescript
// In ErrorBoundary.jsx
log.error('React error boundary triggered', error, {
  componentStack: errorInfo.componentStack,
  userAgent: navigator.userAgent,
  timestamp: Date.now(),
});
```

## Testing

### Test Configuration

```typescript
// In tests, use a silent logger
const testLogger = new Logger({
  level: LogLevel.SILENT,
  enableConsole: false,
  enableStructuredOutput: false,
});
```

### Mocking for Tests

```typescript
// Mock console methods for testing
jest.spyOn(console, 'info').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

// Test logging calls
log.info('Test message');
expect(console.info).toHaveBeenCalledWith(
  expect.stringContaining('INFO Test message')
);
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**: Check log level configuration
2. **Sensitive data leaking**: Verify sensitive field patterns
3. **Performance impact**: Disable performance tracking in production if needed
4. **Missing module names**: Ensure proper logger initialization

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
const debugLogger = new Logger({
  level: LogLevel.DEBUG,
  enableConsole: true,
  enableStructuredOutput: false,
});
```

## Migration Status

### Completed
- [x] Core logging system implementation
- [x] Module-specific loggers
- [x] Performance tracking
- [x] Sensitive data redaction
- [x] Migration script
- [x] Comprehensive test suite
- [x] Documentation

### In Progress
- [ ] Full codebase migration
- [ ] External service integrations
- [ ] Log aggregation setup

### Future Enhancements
- [ ] Log rotation and retention policies
- [ ] Real-time log streaming
- [ ] Advanced filtering and search
- [ ] Log analytics dashboard
- [ ] Automated alerting

## File Structure

```
src/lib/
  logger.ts              # Core logging system
  __tests__/
    logger.test.ts        # Comprehensive test suite
scripts/
  migrate-logging.js     # Migration automation
```

## Contributing

When adding new logging:

1. Use appropriate log levels
2. Include relevant metadata
3. Use module-specific loggers when possible
4. Test log output in different environments
5. Update documentation for new features

## License

This logging system is part of the Riskon project and follows the same MIT License.
