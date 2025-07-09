# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Node.js serverless API service for tracking decisions made via email. It uses:
- **Framework**: Vercel serverless functions (no Express/Koa)
- **Database**: PostgreSQL (Neon for production, Docker for local)
- **Email**: SendGrid for inbound/outbound email processing
- **AI**: OpenAI GPT-4 for decision extraction
- **Module System**: ES6 modules (`"type": "module"`)

## Common Commands

### Development
```bash
# Start local database (Docker required)
npm run db:start

# Run all tests (includes environment checks)
npm test

# Run specific test suites
npm run test:integration    # Full integration tests
npm run test:manual        # Manual test scenarios

# Database operations
npm run db:migrate         # Run pending migrations
npm run db:migrate:create  # Create new migration
npm run seed              # Seed test data
npm run db:reset          # Reset local database
```

### Testing Single Features
```bash
# Run specific manual test scenario
npm run test:manual <scenario_name>

# List available test scenarios
npm run test:manual list
```

## Architecture

### API Structure
- `/api/` - Serverless endpoints (each file is an endpoint)
  - `webhook-inbound.js` - Main email processing webhook
  - `confirm-decision.js` - Email confirmation handler
  - `decisions-ui.js` - Decision viewing interface
  - `/slack/` - Slack integration endpoints

### Core Libraries
- `/lib/config.js` - Configuration management (env vars)
- `/lib/database.js` - PostgreSQL connection and utilities
- `/lib/email.js` - SendGrid email functionality

### Database Schema
The main table is `decisions` with:
- Email thread tracking
- Decision content and confirmation status
- Timestamps and metadata

### Testing Strategy
- No unit test framework installed
- Integration tests simulate full email → decision flow
- Shell script wrapper checks environment before running tests
- Manual test scenarios for debugging specific features

## Key Workflows

### Email → Decision Flow
1. Email CC'd to `decisions@bot.set4.io`
2. SendGrid webhook hits `/api/webhook-inbound`
3. OpenAI extracts decision information
4. Confirmation email sent to decision maker
5. User clicks confirmation link
6. Decision stored in PostgreSQL

### Database Migrations
```bash
# Create new migration
npm run db:migrate:create -- descriptive-name

# Migration files go in scripts/migrations/
# Format: YYYYMMDDHHMMSS_descriptive_name.sql

# Run migrations
npm run db:migrate
```

### Local Development Setup
1. Install Docker Desktop
2. Copy `env.local.template` to `.env.local`
3. Start database: `npm run db:start`
4. Run migrations: `npm run db:migrate`
5. Seed data: `npm run seed`
6. Run tests: `npm test`

## Environment Variables

Required for local development (in `.env.local`):
- `POSTGRES_URL` - Database connection string
- `SENDGRID_API_KEY` - For email sending
- `SENDER_EMAIL` - Outbound email address
- `OPENAI_API_KEY` - For decision extraction
- `VERCEL_PROTECTION_BYPASS` - For webhook security

## Important Notes

- Always use ES6 module syntax (import/export)
- Database operations should use the utilities in `/lib/database.js`
- Email sending uses SendGrid via `/lib/email.js`
- Test webhook endpoints exist for development (`/api/test-webhook`, `/api/simple-test`)
- Vercel functions have a 10-second timeout limit
- Database branching is automatic for preview deployments via Neon integration