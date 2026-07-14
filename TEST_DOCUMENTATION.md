# Test Suite Documentation

## Overview

This project now includes a comprehensive test suite covering unit tests, API mock tests, component tests, and contract interaction tests. The test suite is configured to achieve a minimum of 70% code coverage across all critical components.

## Test Structure

### Configuration Files

- **`jest.config.js`** - Main Jest configuration with coverage thresholds and test patterns
- **`jest.setup.js`** - Global test setup with DOM mocks and polyfills
- **`package.json`** - Updated with test scripts and dependencies

### Test Files

#### Unit Tests
- **`src/lib/__tests__/lightweightRiskModel.test.js`** - Tests for the ML risk scoring model
  - Score calculation accuracy
  - Tier mapping logic
  - Feature importance analysis
  - Edge cases and error handling
  - Model consistency and determinism

#### API Mock Tests
- **`src/lib/__tests__/horizonDataCollector.test.js`** - Tests for Horizon API data collection
  - API response handling
  - Pagination support
  - Caching mechanisms
  - Error handling and retries
  - Data validation and transformation

#### Component Tests
- **`src/components/__tests__/AutomatedRiskAnalyzer.test.jsx`** - Tests for the main React component
  - User interaction flows
  - State management
  - Loading states
  - Error boundaries
  - Integration with child components

#### Contract Interaction Tests
- **`src/lib/__tests__/riskTierClient.test.ts`** - Tests for Stellar contract interactions
  - Transaction building and signing
  - RPC simulation and submission
  - Cache invalidation
  - Validation and error handling
  - React hook integration

## Running Tests

### Basic Commands

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage reporting
npm run test:coverage
```

### Coverage Reports

Coverage reports are generated in the following formats:
- **Console output** - Text summary with coverage percentages
- **HTML report** - Detailed interactive report in `coverage/lcov-report/index.html`

### Coverage Thresholds

The test suite enforces minimum coverage thresholds:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Test Categories

### 1. Unit Tests (`lightweightRiskModel.test.js`)

**Coverage Areas:**
- Risk score calculation algorithms
- Feature normalization and weighting
- Tier classification logic
- Confidence scoring
- Explanation generation
- Recommendation engine

**Key Test Scenarios:**
- Low, medium, and high risk profiles
- Edge cases (zero values, extreme values)
- Missing or invalid data handling
- Model consistency across multiple runs
- Feature importance accuracy

### 2. API Mock Tests (`horizonDataCollector.test.js`)

**Coverage Areas:**
- Horizon API integration
- Data pagination handling
- Cache management
- Error recovery
- Data transformation

**Key Test Scenarios:**
- Successful data collection
- API error handling
- Cache hit/miss scenarios
- Paginated responses
- Date range filtering
- Night/day ratio calculations

### 3. Component Tests (`AutomatedRiskAnalyzer.test.jsx`)

**Coverage Areas:**
- React component rendering
- User interaction flows
- State management
- Error boundaries
- Integration with contexts

**Key Test Scenarios:**
- Initial rendering states
- Analysis workflow
- Blockchain updates
- Rate limiting
- Loading and error states
- Child component integration

### 4. Contract Tests (`riskTierClient.test.ts`)

**Coverage Areas:**
- Stellar SDK integration
- Transaction building
- RPC simulation
- Cache management
- Validation logic
- React hook functionality

**Key Test Scenarios:**
- Read operations (getRiskTier, getScore, etc.)
- Write operations (setRiskTier, updateChosenTier)
- Address and score validation
- Account resolution
- Error handling and recovery
- Cache invalidation

## Mocking Strategy

### External Dependencies

- **Stellar SDK** - Mocked to avoid network calls
- **Horizon API** - Mocked with realistic response patterns
- **Browser APIs** - Mocked (localStorage, fetch, etc.)
- **React Contexts** - Mocked for isolated testing

### Cache Management

- **getCache/setCache** - Mocked to test caching behavior
- **invalidateCache** - Mocked to verify cache invalidation
- **localStorage** - Mocked for client-side storage tests

### UI Components

- **Child components** - Mocked to isolate parent component logic
- **Toast notifications** - Mocked to verify user feedback
- **Loading states** - Tested through mock implementations

## Test Data

### Mock Wallet Addresses
```javascript
const mockWalletAddress = 'GD5TESTEXAMPLEADDRESS123456789';
const mockContractId = 'C1234567890ABCDEF1234567890ABCDEF12345678';
```

### Sample Risk Metrics
```javascript
const mockMetrics = {
  totalVolume: 5000,
  uniqueCounterparties: 25,
  assetDiversity: 4,
  nightDayRatio: 0.3,
};
```

### Mock API Responses
- Payment operations with various asset types
- Transaction records with metadata
- Paginated response structures
- Error response patterns

## Best Practices

### Test Organization
- Group related tests in `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test both happy paths and error cases

### Mock Management
- Clear mocks before each test
- Use consistent mock implementations
- Mock at the appropriate level of abstraction
- Verify mock interactions where important

### Coverage Goals
- Focus on critical business logic
- Test error handling paths
- Cover edge cases and boundary conditions
- Maintain high coverage thresholds

### Performance Considerations
- Use async/await for asynchronous tests
- Avoid unnecessary delays in tests
- Mock expensive operations
- Keep test execution time reasonable

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

### Coverage Reporting
- Upload coverage reports to services like Codecov
- Set up coverage badges in README
- Monitor coverage trends over time
- Address coverage regressions promptly

## Troubleshooting

### Common Issues

1. **Mock Configuration Errors**
   - Ensure mocks are properly configured
   - Check mock implementation matches real API
   - Verify mock return values are expected types

2. **Async Test Timeouts**
   - Use proper async/await syntax
   - Increase timeout if needed for slow operations
   - Mock slow operations to speed up tests

3. **Coverage Gaps**
   - Identify uncovered code paths
   - Add tests for edge cases
   - Review if uncovered code is necessary

4. **Test Isolation**
   - Ensure tests don't depend on each other
   - Clear state between tests
   - Use fresh mocks for each test

### Debugging Tips

- Use `console.log` sparingly in tests
- Leverage Jest's debugging capabilities
- Check mock call history and arguments
- Verify test setup and teardown

## Future Enhancements

### Additional Test Types
- **Integration tests** - End-to-end workflow testing
- **Performance tests** - Load and stress testing
- **Visual regression tests** - UI consistency testing
- **Contract deployment tests** - Real blockchain testing

### Test Utilities
- Custom matchers for common assertions
- Test data factories for consistent mock data
- Helper functions for complex test setups
- Shared test configurations

### Monitoring
- Test execution time tracking
- Coverage trend analysis
- Test failure rate monitoring
- Automated test health reports

## Conclusion

This comprehensive test suite provides confidence in the reliability and correctness of the riskon application. With 70% minimum coverage across all critical components, the tests help prevent regressions and ensure robust functionality as the application evolves.

Regular test maintenance and expansion will continue to improve code quality and developer confidence in the codebase.
