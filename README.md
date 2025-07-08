# Decision Tracker API

A Vercel-deployed API service that tracks decisions made via email and provides query capabilities.

## Environment Variables

Add these environment variables in your Vercel project settings:

```
POSTGRES_URL=postgres://neondb_owner:npg_FMVvfnsXIt17@ep-shiny-thunder-aduwnep3-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require
SENDGRID_API_KEY=your_sendgrid_api_key_here
SENDER_EMAIL=your_sender_email@domain.com
VERCEL_PROTECTION_BYPASS=your_protection_bypass_token_here
```

## Setup

1. Add environment variables to Vercel project settings
2. Deploy to Vercel
3. Run `/api/setup-db` once to initialize the database

## API Endpoints

- `POST /api/webhook-inbound` - Webhook for processing incoming emails
- `GET /api/setup-db` - Initialize database table

## Deployment

The API is deployed at: https://track-set4.vercel.app/
