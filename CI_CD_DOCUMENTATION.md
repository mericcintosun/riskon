# CI/CD Pipeline Documentation

## Overview

This document describes the comprehensive CI/CD pipeline implemented for the `riskon` project using GitHub Actions. The pipeline provides automated testing, code quality checks, building, and deployment processes.

## Pipeline Architecture

### Workflows

The CI/CD pipeline consists of several GitHub Actions workflows:

1. **`ci-cd.yml`** - Main comprehensive CI/CD pipeline
2. **`code-quality.yml`** - Dedicated code quality checks
3. **`deploy.yml`** - Automated deployment workflows
4. **`test.yml`** - Existing test suite (enhanced)
5. **`contract-tests.yml`** - Smart contract testing (enhanced)

## Main CI/CD Pipeline (`ci-cd.yml`)

### Triggers

- **Push events**: `main`, `dev`, `develop` branches
- **Pull requests**: `main`, `dev`, `develop` branches
- **Release events**: When releases are published

### Jobs

#### 1. Code Quality Checks
- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting checks
- **Next.js lint**: Framework-specific linting

#### 2. Frontend Tests and Build
- **Unit tests**: Jest with React Testing Library
- **Integration tests**: End-to-end testing
- **Build process**: Next.js production build
- **Coverage reporting**: Code coverage with Codecov

#### 3. Smart Contract Tests and Build
- **Rust tests**: Cargo unit tests
- **Clippy**: Rust linting and static analysis
- **Formatting**: Rustfmt checks
- **Contract build**: WASM compilation for Soroban
- **Coverage**: Rust test coverage with tarpaulin

#### 4. Security Audit
- **npm audit**: Node.js security vulnerability scanning
- **cargo audit**: Rust security vulnerability scanning
- **Outdated dependencies**: Dependency freshness checks

#### 5. Performance Tests
- **Lighthouse CI**: Web performance testing
- **Contract benchmarks**: Gas optimization tests

#### 6. Deployment Jobs
- **Staging deployment**: Automatic deployment for `dev` branch
- **Production deployment**: Automatic deployment for `main` branch
- **Release deployment**: Deployment on GitHub releases

## Code Quality Workflow (`code-quality.yml`)

### Frontend Quality
- Comprehensive ESLint configuration with React and TypeScript rules
- Prettier formatting with consistent style guide
- TypeScript type checking
- Bundle size analysis

### Smart Contract Quality
- Rust formatting and linting
- Documentation generation
- WASM target validation

### Dependency Quality
- Security vulnerability scanning
- Outdated dependency detection
- License compliance checks

### Performance Quality
- Bundle size analysis
- Lighthouse performance testing
- Regression detection

### Code Coverage
- Frontend test coverage with Jest
- Coverage threshold enforcement (70% minimum)
- Coverage reporting to Codecov

## Deployment Workflow (`deploy.yml`)

### Environments

#### Staging Environment
- **Trigger**: Push to `dev` branch
- **Target**: Vercel preview deployment
- **Smart Contract**: Stellar Testnet deployment
- **Health checks**: Post-deployment verification

#### Production Environment
- **Trigger**: Push to `main` branch
- **Target**: Vercel production deployment
- **Smart Contract**: Stellar Mainnet deployment
- **Comprehensive testing**: Full test suite before deployment

#### Release Deployment
- **Trigger**: GitHub release publication
- **Assets**: Creation and upload of release artifacts
- **Multi-format**: Both tar.gz and zip archives
- **Production deployment**: Full production rollout

### Rollback Mechanism
- **Automatic rollback**: On deployment failure
- **Previous commit**: Revert to last successful deployment
- **Notifications**: Alert on rollback actions

### Health Checks
- **Application health**: HTTP response validation
- **Endpoint testing**: Critical functionality verification
- **Smoke tests**: Basic functionality validation

## Required Secrets

### Vercel Deployment
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

### Stellar Deployment
- `STELLAR_TESTNET_SECRET_KEY`: Testnet deployment key
- `STELLAR_MAINNET_SECRET_KEY`: Mainnet deployment key

### Code Quality & Monitoring
- `CODECOV_TOKEN`: Codecov coverage reporting
- `LHCI_GITHUB_APP_TOKEN`: Lighthouse CI integration

### GitHub
- `GITHUB_TOKEN`: GitHub API access (automatically provided)

## Testing Strategy

### Frontend Testing
- **Unit Tests**: Component-level testing with Jest
- **Integration Tests**: Cross-component interaction testing
- **E2E Tests**: Full user journey testing
- **Coverage**: Minimum 70% code coverage requirement

### Smart Contract Testing
- **Unit Tests**: Rust contract function testing
- **Integration Tests**: Contract-frontend interaction
- **Gas Optimization**: Performance and cost analysis
- **Security Tests**: Vulnerability and edge case testing

### Performance Testing
- **Lighthouse**: Web vitals and performance metrics
- **Bundle Analysis**: JavaScript bundle size optimization
- **Contract Benchmarks**: WASM execution performance

## Quality Gates

### Code Quality Requirements
- **ESLint**: No critical linting errors
- **Prettier**: Consistent code formatting
- **TypeScript**: No type errors
- **Clippy**: No Rust linting warnings

### Testing Requirements
- **Unit tests**: All tests must pass
- **Coverage**: Minimum 70% coverage
- **Integration tests**: Critical path validation
- **Security audits**: No critical vulnerabilities

### Performance Requirements
- **Lighthouse**: Minimum scores:
  - Performance: 80+
  - Accessibility: 90+
  - Best Practices: 80+
  - SEO: 80+
- **Bundle size**: Under specified limits
- **Contract size**: Under 1MB WASM limit

## Monitoring and Notifications

### Pipeline Status
- **Success notifications**: Confirmation of successful deployments
- **Failure notifications**: Immediate alert on pipeline failures
- **Rollback notifications**: Alert on automatic rollbacks

### Deployment Monitoring
- **Health checks**: Post-deployment application verification
- **Performance monitoring**: Continuous performance tracking
- **Error tracking**: Automated error detection and reporting

## Configuration Files

### ESLint Configuration
```json
{
  "extends": [
    "next/core-web-vitals",
    "prettier",
    "@typescript-eslint/recommended"
  ],
  "plugins": [
    "prettier",
    "react",
    "react-hooks",
    "@typescript-eslint"
  ],
  "rules": {
    "prettier/prettier": "error",
    "no-unused-vars": "warn",
    "no-console": "warn",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "avoid",
  "endOfLine": "lf"
}
```

### Jest Configuration
Enhanced Jest setup with:
- jsdom environment for React testing
- Path aliases for clean imports
- Coverage collection from source files
- Test path patterns for automatic discovery

### Lighthouse CI Configuration
```javascript
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000'],
      startServerCommand: 'npm run dev',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
  },
};
```

## Best Practices

### Development Workflow
1. **Feature branches**: Create branches for new features
2. **Commit messages**: Use clear, descriptive commit messages
3. **Pull requests**: Require PR review for main branch merges
4. **Testing**: Write tests for all new functionality

### Code Quality
1. **Linting**: Run linting locally before committing
2. **Formatting**: Use Prettier for consistent formatting
3. **Type safety**: Leverage TypeScript for type safety
4. **Documentation**: Document complex logic and APIs

### Security
1. **Secrets management**: Never commit secrets to repository
2. **Dependency updates**: Regularly update dependencies
3. **Security audits**: Run security scans regularly
4. **Code review**: Review code for security issues

## Troubleshooting

### Common Issues

#### Build Failures
- **Dependency conflicts**: Check for incompatible versions
- **Type errors**: Resolve TypeScript compilation issues
- **Missing files**: Ensure all required files are present

#### Test Failures
- **Flaky tests**: Identify and fix non-deterministic tests
- **Mock failures**: Verify mock configurations
- **Coverage drops**: Investigate coverage regression

#### Deployment Issues
- **Environment variables**: Verify all required secrets are set
- **Build artifacts**: Ensure build process completes successfully
- **Health checks**: Verify application health endpoints

### Debugging Steps
1. **Check logs**: Review GitHub Actions logs for detailed error messages
2. **Local reproduction**: Reproduce issues locally
3. **Incremental testing**: Test changes in smaller increments
4. **Rollback**: Use rollback mechanism if needed

## Future Enhancements

### Planned Improvements
1. **Advanced testing**: Add visual regression testing
2. **Performance monitoring**: Implement APM integration
3. **Security scanning**: Add additional security tools
4. **Multi-environment**: Support for additional deployment environments

### Monitoring Enhancements
1. **Custom metrics**: Add application-specific metrics
2. **Alerting**: Implement advanced alerting rules
3. **Dashboards**: Create comprehensive monitoring dashboards
4. **SLA monitoring**: Track service level agreements

## Conclusion

This CI/CD pipeline provides a comprehensive automated workflow for the `riskon` project, ensuring code quality, security, performance, and reliable deployments. The pipeline is designed to scale with the project and can be extended with additional features as needed.

For questions or issues with the CI/CD pipeline, please refer to the GitHub Actions logs or contact the development team.
