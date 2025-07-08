# Decision Tracker API

A Vercel-deployed API service that tracks decisions made via email and provides query capabilities.

## Preview Deployment Test
Testing automatic preview deployments with isolated database branches.

## Environment Variables

Add these environment variables in your Vercel project settings:

```
POSTGRES_URL=postgres://neondb_owner:npg_FMVvfnsXIt17@ep-shiny-thunder-aduwnep3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDER_EMAIL=your_sender_email@domain.com
VERCEL_PROTECTION_BYPASS=your_protection_bypass_token_here
OPENAI_API_KEY=your_openai_api_key_here
```

## Setup

1. Add environment variables to Vercel project settings
2. Deploy to Vercel
3. Run `/api/setup-decisions-db` once to initialize the database

## Testing

### Quick Start
```bash
# Run all integration tests
npm test

# Run specific test types
npm run test:integration    # Full integration test suite
npm run test:manual        # Manual test scenarios with detailed output
```

### Test Scripts

- **`tests/run-tests.sh`** - Main test runner with environment checks
- **`tests/integration-test.js`** - Comprehensive automated integration tests
- **`tests/manual-test-scenarios.js`** - Manual test scenarios for debugging

### Test Coverage

The integration tests cover:
- ✅ Email webhook processing
- ✅ Decision extraction with OpenAI
- ✅ Database operations (create, read, update)
- ✅ Email confirmation flow
- ✅ Query functionality
- ✅ Duplicate message handling
- ✅ Thread continuation
- ✅ API endpoint availability

### Local Development Setup

**Option 1: Local Database with Docker (Recommended)**

1. Install Docker Desktop from https://docker.com/products/docker-desktop

2. Copy the environment template:
```bash
cp env.local.template .env.local
```

3. Start Docker Desktop, then start the database:
```bash
npm run db:start
```

4. The database will be available at `postgres://track_user:track_password@localhost:5432/track_dev`

5. Run tests:
```bash
npm test
```

**Option 1b: Local Database without Docker**

If you prefer not to use Docker:

1. Install PostgreSQL locally:
   - macOS: `brew install postgresql`
   - Ubuntu: `sudo apt install postgresql`
   - Windows: Download from postgresql.org

2. Create a local database:
```bash
createdb track_dev
psql track_dev < scripts/init-db.sql
```

3. Update `.env.local` with your local PostgreSQL URL

**Option 2: Remote Database**

Edit `.env.local` to use the remote database URL instead of the local one, then run tests.

### Database Management

**Docker Commands (if using Docker):**
```bash
npm run db:start   # Start local PostgreSQL database
npm run db:stop    # Stop local database
npm run db:reset   # Reset database (removes all data)
npm run db:status  # Check database status
npm run db:logs    # View database logs
```

**Manual PostgreSQL Commands (if using local install):**
```bash
# Start PostgreSQL (varies by OS)
brew services start postgresql  # macOS
sudo systemctl start postgresql # Linux

# Connect to database
psql postgres://track_user:track_password@localhost:5432/track_dev

# Reset database
psql track_dev < scripts/init-db.sql
```

### Seeding Data

```bash
npm run seed       # Add sample decision data
```

### Manual Testing

```bash
# Run all manual test scenarios
npm run test:manual

# Run specific scenario
npm run test:manual complex_decision

# List available scenarios
npm run test:manual list
```

## API Endpoints

- `GET /` - View confirmed decisions (homepage)
- `POST /api/webhook-inbound` - Webhook for processing incoming emails
- `POST /api/test-webhook` - Simplified webhook for testing (no OpenAI)
- `POST /api/simple-test` - Direct database insertion for testing
- `GET /api/confirm-decision?token=<token>` - Confirm a decision
- `GET /api/decisions-ui` - View confirmed decisions
- `GET /api/setup-decisions-db` - Initialize database table

## How It Works

1. **Email Processing**: When an email is CC'd to `decisions@bot.set4.io`, the webhook processes it
2. **Decision Extraction**: OpenAI GPT-4 analyzes the email content to extract decision information
3. **Confirmation Flow**: A confirmation email is sent to the decision maker
4. **Storage**: Confirmed decisions are stored in PostgreSQL with full context
5. **Querying**: Send emails directly to the bot to query recent decisions

## Deployment

The API is deployed at: https://track-set4.vercel.app/

## Testing Without Email

The integration tests simulate the entire email-to-threads workflow without requiring manual email sending. This allows you to:

- Test decision extraction logic
- Verify database operations
- Check confirmation flows
- Validate API endpoints
- Debug issues quickly

Perfect for development and CI/CD pipelines!
