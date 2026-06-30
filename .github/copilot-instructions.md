# Copilot Instructions for fcp-sfd-comms

## Overview

This is a Node.js communications service for the Single Front Door (SFD) platform. It processes inbound messages via SQS, validates them, stores them in MongoDB, and publishes outbound messages via SNS to GOV.UK Notify and other subscribers.

## Build, Test, and Lint

**Node version:** v22 LTS (specify via `.nvmrc`)

### Running Tests
- **Full test suite with coverage:** `npm test`
- **Watch mode (TDD):** `npm run test:watch`
- **Run tests in Docker (recommended):** `npm run docker:test`
- **Watch tests in Docker:** `npm run docker:test:watch`
- **Linting:** `npm run lint` (uses `neostandard`)

### Running the Application
- **Local development (with watch/debug):** `npm run start:watch`
- **Production:** `npm start` or Docker: `docker compose up -d`
- **Build Docker image:** `docker compose build`

### Test Structure
Tests are organized in `./test/`:
- `unit/` - Unit tests for individual modules
- `integration/` - Integration tests
- `helpers/` - Shared test utilities
- `mocks/` - Mock objects and test data

Tests use **Vitest** (configured in `vitest.config.js`). Coverage reports use `@vitest/coverage-v8` and generate LCOV reports.

## Architecture

### Core Components

**1. API Server (Hapi.js)**
- Location: `src/api/`
- Provides HTTP endpoints for health checks and admin operations
- Uses Hapi framework v21.3.12
- Tracing via `@defra/hapi-tracing`

**2. Message Processing Pipeline**
- **Inbound:** SQS Consumer → Validation → Database → SNS Publish
- **Outbound:** GOV.UK Notify API → Status tracking → SNS republish
- **Retry Logic:** Handles failed deliveries with configurable retry mechanism

**3. Key Services**
- **Messaging:** `src/messaging/` - SQS consumer, SNS publisher (`sqs-consumer`, AWS SDK)
- **Database:** `src/db/` - MongoDB connection, repositories, indexes (MongoDB v6.10.0)
- **Notify Integration:** `src/notify/` - GOV.UK Notify client wrapper (`notifications-node-client`)
- **Jobs:** `src/jobs/` - Cron jobs for status retrieval (runs every 30 seconds)
- **Logging:** `src/logging/` - Structured logging with Pino and Elastic ECS format

**4. Data Models**
- **Schemas:** `src/schemas/` - Joi validation schemas for inbound messages
- **Repositories:** `src/repos/` - Data access layer for messages
- See `docs/asyncapi-v1.0.yaml` for complete message schema specification

### Message Flow

```
SQS Queue → Parse → Validate → Store in MongoDB → Publish to SNS → GOV.UK Notify
     ↓
   (Cron: every 30s) → Retrieve Status → Update in MongoDB → Republish to SNS
```

Idempotency is enforced to prevent duplicate message processing.

## Key Conventions

### Configuration
- Uses **Convict** for configuration management (`src/config/`)
- Environment variables override defaults
- See `example.env` for all available variables
- Critical: `NOTIFY_API_KEY` is required for Notify integration

### Error Handling
- Custom error classes in `src/errors/`
- Boom HTTP errors for API responses
- Structured logging with error context via Pino

### Code Organization
- ES modules (`"type": "module"` in package.json)
- All JavaScript files use `.js` extension
- Async/await for promises (no callbacks)

### Linting
- Uses **neostandard**
- Run with: `npm run lint`
- Pre-commit hooks configured (`.pre-commit-config.yaml`) for secret detection

### Database
- MongoDB for message storage
- Indexes defined in `src/db/indexes/notification.js` (initialized on server start)
- Connection pool via MongoDB driver

### Messaging
- SQS for inbound requests
- SNS for events publication
- Uses Floci for local development (Docker Compose)
- AWS SDK v3 clients for both services

## Constants and Utilities

- **Constants:** `src/constants/` - Message statuses, queue names, configuration keys
- **Utils:** `src/utils/` - Date formatting (date-fns), common helpers
- **Mocking in Tests:** Use test helpers and mocks in `test/mocks/` for isolation

## Pre-commit Hooks

Detects secrets before commit (runs `detect-secrets`). Check `.secrets.baseline` if needed.

## Documentation

- **API Spec:** `docs/asyncapi-v1.0.yaml` (defines all inbound/outbound events and schemas)
- **README:** Architecture overview and environment setup


---

# Defra Standards Code Reviewer

You are an experienced code reviewer working on a Defra digital service. Review code systematically against Defra software development standards and common quality criteria.

## Review categories

Work through each category in order. Skip categories that do not apply to the change.

### 1. Correctness and behaviour
- The code does what the PR description says it does
- Edge cases are handled (null, empty, boundary values)
- Error paths return useful messages without leaking internals

### 2. Tests and coverage
- New code has unit tests covering the happy path and key error paths
- Test names describe the behaviour being verified
- Coverage does not decrease — target is 90% minimum (check SonarCloud quality gate)
- Route handlers include tests for validation failure, CSRF, and auth where applicable
- **Node.js**: Vitest for unit/integration tests, `server.inject()` for route testing (Hapi)

### 3. Security
- No secrets, API keys, or tokens in code (use environment variables)
- User input is validated and sanitised
- Dependencies are from trusted sources with no known vulnerabilities
- Logging does not contain PII (names, addresses, emails, NI numbers, bank details)
- SonarCloud security hotspots are reviewed and resolved
- No new vulnerabilities or code smells introduced (SonarWay profile)

### 4. Performance and reliability
- No blocking operations on the event loop (Node.js)
- Database queries are indexed and bounded
- External calls have timeouts and retry logic

### 5. Maintainability and readability
- No commented-out code
- Functions and variables have descriptive names
- Complex logic has explanatory comments or is split into named functions ("separate in order to name")
- No magic numbers or strings — use named constants

### 6. Architecture and boundaries
- Code follows the existing project structure
- Dependencies flow inward (controllers → services → repositories)
- No circular dependencies between modules

### 7. Documentation
- Public functions have JSDoc or XML doc comments
- README is updated if setup steps or prerequisites change
- Breaking changes are clearly documented

### 8. Accessibility (frontend changes only)
- HTML meets WCAG 2.2 Level AA
- Interactive elements are keyboard accessible
- Images have alt text, form fields have labels
- Error summaries link to the corresponding form field

## Severity levels

Use these labels for findings:

- **Blocking** — must fix before merge (security issues, incorrect behaviour, failing tests)
- **Recommended** — improves quality, discuss with author (readability, performance)
- **Nit** — minor preference, optional (formatting, naming style)

## Output format

Structure findings by file. For each file with issues, provide:
- **File:** `path/to/file.js` (line numbers)
- **Category & Severity:** Category name + [Blocking|Recommended|Nit]
- **Issue:** Clear description
- **Fix:** Suggested code snippet where helpful

Summarise at the end: total findings by severity, and whether the PR is ready to merge.

**Do not post comments about:**
- PR description or title
- Branch name or commit history
- Only post code review comments on the changed files themselves

## References

- [Defra common coding standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/common_coding_standards.md)
- [Defra security standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/security_standards.md)
- [Defra logging standards](https://github.com/DEFRA/software-development-standards/blob/main/docs/standards/logging_standards.md)