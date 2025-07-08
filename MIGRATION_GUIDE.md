# Database Migration Guide

This guide explains how to set up database branching for preview environments using the Neon Postgres Previews Integration.

## Overview

The Neon integration provides:
- **Automatic database branching** for each preview deployment
- **Isolated databases** for each pull request
- **Automatic cleanup** when branches are deleted
- **Zero configuration** after initial setup

## Setup Steps

### 1. Install Neon Integration

1. Go to your [Neon Console](https://console.neon.tech)
2. Navigate to **Integrations** → Click **Add** under Vercel
3. Click **Install from Vercel Marketplace**
4. Choose your Vercel account and project
5. Select your Neon project and database
6. **Enable these options:**
   - ✅ Create a branch for your development environment
   - ✅ Automatically delete obsolete Neon branches
7. Click **Connect** and **Done**

### 2. Run Migrations Locally

```bash
# Start local database
npm run db:start

# Run migrations to create tables
npm run db:migrate

# Seed with test data
npm run seed
```

That's it! The integration handles everything else automatically.

## How It Works

### Preview Deployments

1. **Push to feature branch** → Vercel creates preview deployment
2. **Neon creates database branch** → Isolated copy of production schema
3. **Environment variables injected** → `DATABASE_URL` set automatically
4. **Preview deployment connects** → Uses branch database

### Production Deployments

1. **Merge to main** → Vercel production deployment
2. **Uses main database** → No branching for production
3. **Migrations should be run** → Before deploying breaking changes

### Database Cleanup

When a PR is closed or branch deleted:
- Neon automatically deletes the database branch
- No manual cleanup required

## Commands Reference

```bash
# Local development
npm run start:local          # Start everything locally
npm run db:migrate           # Run pending migrations
npm run db:migrate:create    # Create new migration

# Example: Create a new migration
npm run db:migrate:create -- add-user-preferences
# Edit the file in scripts/migrations/
npm run db:migrate
```

## Database Migrations

### Creating Migrations

```bash
# Create a new migration file
npm run db:migrate:create -- descriptive-name

# This creates a timestamped file in scripts/migrations/
# Example: 20240115120000_descriptive_name.sql
```

### Migration Best Practices

1. **Always use migrations** - Never modify schema directly
2. **Test locally first** - Run migrations locally before pushing
3. **One change per migration** - Keep migrations focused
4. **Backward compatible** - Don't break existing deployments
5. **Document breaking changes** - Add comments in migration files

### Example Migration

```sql
-- Migration: Add user preferences table
-- Created: 2024-01-15

CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  theme VARCHAR(50) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

## Troubleshooting

### Preview deployment using wrong database?

1. Check Vercel project settings → Environment Variables
2. Ensure no `DATABASE_URL` is hardcoded for preview environment
3. The Neon integration should inject it automatically

### Migrations not running on preview?

Currently, migrations need to be run manually or through a build step:

1. Add to `package.json` build script:
   ```json
   "build": "npm run db:migrate && next build"
   ```

2. Or run migrations in your app startup

### Local development issues

```bash
# Reset local database
npm run db:reset
npm run db:migrate
npm run seed
```

## Benefits

- **Zero-config branching** - Automatic after integration setup
- **Production-like data** - Each branch starts from production schema
- **Fast creation** - Branches created in ~1 second
- **Cost effective** - Only charged for unique data
- **Automatic cleanup** - No orphaned databases