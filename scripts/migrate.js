#!/usr/bin/env node
import { sql } from '../lib/database.js';
import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.local' });

const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✓ Migrations table ready');
  } catch (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
}

async function getExecutedMigrations() {
  const result = await sql`SELECT filename FROM migrations ORDER BY filename`;
  return result.rows.map(row => row.filename);
}

async function getAllMigrations() {
  const files = await readdir(MIGRATIONS_DIR);
  return files
    .filter(file => file.endsWith('.sql'))
    .sort();
}

async function runMigration(filename) {
  const filepath = join(MIGRATIONS_DIR, filename);
  const content = await readFile(filepath, 'utf-8');
  
  console.log(`Running migration: ${filename}`);
  
  try {
    // Execute migration SQL
    await sql.query(content);
    
    // Record migration
    await sql`
      INSERT INTO migrations (filename) 
      VALUES (${filename})
    `;
    
    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    console.error(`✗ Migration failed: ${filename}`, error);
    throw error;
  }
}

async function migrate() {
  console.log('Starting database migration...\n');
  
  try {
    await ensureMigrationsTable();
    
    const executed = await getExecutedMigrations();
    const all = await getAllMigrations();
    const pending = all.filter(m => !executed.includes(m));
    
    if (pending.length === 0) {
      console.log('✓ Database is up to date');
      return;
    }
    
    console.log(`Found ${pending.length} pending migration(s):\n`);
    
    for (const migration of pending) {
      await runMigration(migration);
    }
    
    console.log('\n✓ All migrations completed successfully');
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrate();
}