#!/usr/bin/env node
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS_DIR = join(__dirname, 'migrations');

function generateTimestamp() {
  const now = new Date();
  return now.toISOString().slice(0, 19).replace(/[-:T]/g, '');
}

async function createMigration(name) {
  if (!name) {
    console.error('Usage: npm run db:migrate:create -- <migration-name>');
    console.error('Example: npm run db:migrate:create -- add-user-table');
    process.exit(1);
  }
  
  const timestamp = generateTimestamp();
  const filename = `${timestamp}_${name.replace(/[^a-z0-9_]/gi, '_').toLowerCase()}.sql`;
  const filepath = join(MIGRATIONS_DIR, filename);
  
  const template = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}

-- Write your migration SQL here
-- Example:
-- CREATE TABLE users (
--   id SERIAL PRIMARY KEY,
--   email VARCHAR(255) UNIQUE NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
`;
  
  try {
    await writeFile(filepath, template);
    console.log(`✓ Created migration: ${filename}`);
    console.log(`  Edit the file at: ${filepath}`);
  } catch (error) {
    console.error('Failed to create migration:', error);
    process.exit(1);
  }
}

// Get migration name from command line arguments
const migrationName = process.argv[2];
createMigration(migrationName);