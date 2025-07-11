# Decision Tracker

A collaborative decision tracking platform that captures, organizes, and manages decisions made via email. Built with Vercel serverless functions and PostgreSQL.

## Features

### Core Functionality

- **Email-based Decision Capture**: CC `decisions@bot.set4.io` to automatically extract and track decisions
- **AI-powered Extraction**: Uses OpenAI GPT-4 to intelligently parse decision content from emails
- **Confirmation Workflow**: Decision makers receive confirmation emails to verify captured decisions
- **Thread Tracking**: Maintains context by grouping related decisions by email thread

### Authentication & Authorization

- **Multi-provider OAuth**: Supports Google and Microsoft authentication
- **Session Management**: Secure JWT-based sessions with 30-day duration
- **User-specific Views**: Each user sees only their own decisions
- **Protected Routes**: API endpoints require authentication

### Organization & Discovery

- **Tagging System**: Automatic and manual tagging of decisions for easy categorization
- **Advanced Filtering**: Filter decisions by tags with "Match Any" or "Match All" logic
- **Full-text Search**: Query decisions by content or metadata
- **Export Capabilities**: Download decisions as PDF for reporting

### User Interface

- **Responsive Web App**: Modern UI for viewing and managing decisions
- **Expandable Cards**: Click decisions to view full details in an overlay
- **Tag Management**: Add, remove, and filter by tags directly in the UI
- **Bulk Operations**: Delete decisions individually or in bulk

### Integrations

- **Slack Integration**: Post decisions to Slack channels automatically
- **Email Routing**: Conditional routing based on decision content
- **Webhook Support**: Extensible architecture for custom integrations

## API Endpoints

### Authentication

- `GET /api/auth/login` - Initiate OAuth login flow
- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/logout` - Logout and clear session
- `GET /api/auth/check` - Verify authentication status

### Decision Management

- `GET /` - Main UI (requires authentication)
- `GET /api/decisions-ui` - Decision viewing interface
- `GET /api/decisions-with-tags` - Fetch decisions with tag information
- `POST /api/webhook-inbound` - Process incoming emails (SendGrid webhook)
- `GET /api/confirm-decision` - Confirm a decision via email link
- `DELETE /api/delete-decision` - Delete a specific decision

### Tagging

- `GET /api/tags` - List all available tags
- `POST /api/tags` - Add tags to a decision
- `DELETE /api/tags` - Remove tags from a decision

### Slack Integration

- `POST /api/slack/events` - Slack event webhook
- `POST /api/slack/actions` - Slack interactive components
- `GET /api/slack/oauth` - Slack OAuth callback

### Utilities

- `GET /api/setup-decisions-db` - Initialize database (first-time setup)
- `POST /api/email-router` - Route emails based on rules

## Environment Variables

Required environment variables for deployment:

```bash
# Database
POSTGRES_URL=your_postgres_connection_string

# Email Processing
SENDGRID_API_KEY=your_sendgrid_api_key
SENDER_EMAIL=decisions@yourdomain.com
OPENAI_API_KEY=your_openai_api_key

# Authentication
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
MICROSOFT_CLIENT_ID=your_microsoft_oauth_client_id
MICROSOFT_CLIENT_SECRET=your_microsoft_oauth_client_secret
JWT_SECRET=your_jwt_secret_key

# Vercel
VERCEL_PROTECTION_BYPASS=your_protection_bypass_token

# Optional: Slack Integration
SLACK_CLIENT_ID=your_slack_app_client_id
SLACK_CLIENT_SECRET=your_slack_app_client_secret
SLACK_SIGNING_SECRET=your_slack_signing_secret
```

## Database Schema

The application uses PostgreSQL with the following main tables:

### Core Tables

- **decisions** - Main table storing decision content, confirmation status, and metadata
- **users** - User accounts with OAuth provider information
- **tags** - Available tags for categorizing decisions
- **decision_tags** - Many-to-many relationship between decisions and tags

### Key Columns in Decisions Table

- `id` - Unique identifier
- `message_id` - Email message ID for deduplication
- `thread_id` - Groups related decisions
- `decision_text` - The extracted decision content
- `raw_text` - Original email content
- `confirmed` - Confirmation status
- `confirmed_at` - Timestamp of confirmation
- `user_id` - Associated user (foreign key)
- `created_by_email` - Email address of decision maker

## Setup & Development

### Prerequisites

- Node.js 18+
- Docker Desktop (for local development)
- PostgreSQL (if not using Docker)

### Local Development Setup

1. **Clone and Install**

```bash
git clone [repository-url]
cd [project-directory]
npm install
```

2. **Environment Configuration**

```bash
cp env.local.template .env.local
# Edit .env.local with your configuration
```

3. **Database Setup (Docker)**

```bash
npm run db:start    # Start PostgreSQL in Docker
npm run db:migrate  # Run database migrations
npm run seed        # Optional: Add sample data
```

4. **Run Tests**

```bash
npm test                 # Run all tests
npm run test:integration # Integration tests only
npm run test:manual      # Manual test scenarios
```

### Database Management

```bash
# Docker commands
npm run db:start   # Start database
npm run db:stop    # Stop database
npm run db:reset   # Reset all data
npm run db:status  # Check status
npm run db:logs    # View logs

# Migration commands
npm run db:migrate         # Run pending migrations
npm run db:migrate:create  # Create new migration
```

### Development Commands

```bash
# Start development server
vercel dev

# Run specific manual tests
npm run test:manual <scenario_name>

# List available test scenarios
npm run test:manual list
```

## Deployment

### Vercel Deployment

1. Install Vercel CLI: `npm i -g vercel`
2. Configure environment variables in Vercel dashboard
3. Deploy: `vercel --prod`

### Database Migrations

Migrations are automatically run on deployment. To create a new migration:

```bash
npm run db:migrate:create -- descriptive-name
# Edit the created file in scripts/migrations/
# Format: YYYYMMDDHHMMSS_descriptive_name.sql
```

## Architecture

### Technology Stack

- **Runtime**: Node.js with ES6 modules
- **Framework**: Vercel Serverless Functions
- **Database**: PostgreSQL (Neon for production)
- **Email**: SendGrid for inbound/outbound processing
- **AI**: OpenAI GPT-4 for decision extraction
- **Authentication**: OAuth 2.0 (Google & Microsoft)

### Project Structure

```
/api                    # Serverless function endpoints
  /auth                 # Authentication endpoints
  /slack                # Slack integration
  webhook-inbound.js    # Main email processor
  confirm-decision.js   # Confirmation handler
  decisions-ui.js       # Web interface

/lib                    # Shared libraries
  config.js             # Configuration management
  database.js           # Database utilities
  email.js              # Email functionality
  auth.js               # Authentication helpers

/scripts                # Database and utility scripts
  /migrations           # SQL migration files
  init-db.sql          # Initial schema

/tests                  # Test suites
  integration-test.js   # Automated tests
  manual-test-scenarios.js # Debugging scenarios
```

## How It Works

1. **Email Reception**: Users CC `decisions@bot.set4.io` on emails containing decisions
2. **AI Processing**: OpenAI analyzes the email to extract decision information
3. **Confirmation**: Decision maker receives a confirmation email with extracted content
4. **Storage**: Confirmed decisions are stored with full context and metadata
5. **Access**: Users login to view, organize, and export their decisions
6. **Integration**: Decisions can be automatically posted to Slack or other systems

## Security

- OAuth 2.0 authentication with major providers
- JWT tokens for session management
- User isolation - users only see their own decisions
- Webhook signature verification for SendGrid
- Environment-based configuration for secrets

## Contributing

See CLAUDE.md for detailed development guidelines and codebase conventions.

## License

[Your License Here]
