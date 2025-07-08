#!/usr/bin/env node

import { config } from 'dotenv';
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

const DB_PATH = join(projectRoot, 'local.db');
const SQLITE_URL = `file:${DB_PATH}`;

function setupSQLiteDatabase() {
  console.log('🗄️  Setting up SQLite database for local development...');
  
  try {
    // Create/open SQLite database
    const db = new Database(DB_PATH);
    
    // Read and execute the init SQL (adapted for SQLite)
    const initSQL = readFileSync(join(__dirname, 'init-db.sql'), 'utf8');
    
    // Adapt PostgreSQL SQL to SQLite
    const sqliteSQL = initSQL
      .replace(/SERIAL PRIMARY KEY/g, 'INTEGER PRIMARY KEY AUTOINCREMENT')
      .replace(/TEXT\[\]/g, 'TEXT') // SQLite doesn't have arrays, store as JSON
      .replace(/JSONB/g, 'TEXT') // SQLite stores JSON as TEXT
      .replace(/VARCHAR\(\d+\)/g, 'TEXT')
      .replace(/TIMESTAMP/g, 'DATETIME')
      .replace(/NOW\(\)/g, "datetime('now')")
      .replace(/CREATE INDEX IF NOT EXISTS/g, 'CREATE INDEX IF NOT EXISTS')
      .replace(/GRANT ALL PRIVILEGES.*?;/g, '') // Remove GRANT statements
      .replace(/-- Grant permissions[\s\S]*$/g, ''); // Remove grant section
    
    // Execute the adapted SQL
    db.exec(sqliteSQL);
    
    console.log('✅ SQLite database created successfully!');
    console.log(`📍 Database location: ${DB_PATH}`);
    console.log(`🔗 Connection URL: ${SQLITE_URL}`);
    console.log('\n💡 Add this to your .env.local for SQLite development:');
    console.log(`   POSTGRES_URL=${SQLITE_URL}`);
    console.log('\n⚠️  Note: You\'ll need to install better-sqlite3:');
    console.log('   npm install better-sqlite3 --save-dev');
    
    db.close();
    
  } catch (error) {
    console.error('❌ Failed to setup SQLite database:', error.message);
    console.log('\n💡 Try installing better-sqlite3 first:');
    console.log('   npm install better-sqlite3 --save-dev');
    process.exit(1);
  }
}

async function removeSQLiteDatabase() {
  console.log('🗑️  Removing SQLite database...');
  try {
    const fs = await import('fs');
    if (fs.existsSync(DB_PATH)) {
      fs.unlinkSync(DB_PATH);
      console.log('✅ SQLite database removed');
    } else {
      console.log('ℹ️  No SQLite database found');
    }
  } catch (error) {
    console.error('❌ Failed to remove database:', error.message);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'setup':
    setupSQLiteDatabase();
    break;
  case 'remove':
    await removeSQLiteDatabase();
    break;
  default:
    console.log('🗄️  SQLite Database Setup');
    console.log('\nUsage: node scripts/sqlite-setup.js <command>');
    console.log('\nCommands:');
    console.log('  setup  - Create SQLite database for local development');
    console.log('  remove - Remove SQLite database');
    console.log('\nNote: This is a lightweight alternative to PostgreSQL for local development');
    console.log('Install better-sqlite3 first: npm install better-sqlite3 --save-dev');
}
