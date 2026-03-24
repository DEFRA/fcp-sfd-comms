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
- Uses LocalStack for local development (Docker Compose)
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
