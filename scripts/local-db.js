#!/usr/bin/env node

import { config } from 'dotenv';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: '.env.local' });

const DOCKER_COMPOSE_FILE = 'docker-compose.yml';
const LOCAL_POSTGRES_URL = 'postgres://track_user:track_password@localhost:5432/track_dev';

function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    if (output.trim()) {
      console.log(output.trim());
    }
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    return false;
  }
}

function checkDockerCompose() {
  try {
    execSync('docker-compose --version', { stdio: 'pipe' });
    return true;
  } catch {
    try {
      execSync('docker compose version', { stdio: 'pipe' });
      return true;
    } catch {
      console.error('❌ Docker Compose not found. Please install Docker Desktop.');
      return false;
    }
  }
}

function getDockerComposeCommand() {
  try {
    execSync('docker-compose --version', { stdio: 'pipe' });
    return 'docker-compose';
  } catch {
    return 'docker compose';
  }
}

async function startDatabase() {
  console.log('🚀 Starting local PostgreSQL database...');
  
  if (!checkDockerCompose()) {
    process.exit(1);
  }

  const dockerCmd = getDockerComposeCommand();
  
  // Start the database
  if (!runCommand(`${dockerCmd} up -d postgres`, 'Starting PostgreSQL container')) {
    process.exit(1);
  }

  // Wait for database to be ready
  console.log('⏳ Waiting for database to be ready...');
  let retries = 30;
  while (retries > 0) {
    try {
      execSync('docker exec track_postgres_dev pg_isready -U track_user -d track_dev', { stdio: 'pipe' });
      console.log('✅ Database is ready!');
      break;
    } catch {
      retries--;
      if (retries === 0) {
        console.error('❌ Database failed to start within timeout');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n📋 Local Database Info:');
  console.log(`   URL: ${LOCAL_POSTGRES_URL}`);
  console.log('   User: track_user');
  console.log('   Password: track_password');
  console.log('   Database: track_dev');
  console.log('   Port: 5432');
  console.log('\n💡 Add this to your .env.local for local development:');
  console.log(`   POSTGRES_URL=${LOCAL_POSTGRES_URL}`);
}

async function stopDatabase() {
  console.log('🛑 Stopping local PostgreSQL database...');
  
  if (!checkDockerCompose()) {
    process.exit(1);
  }

  const dockerCmd = getDockerComposeCommand();
  runCommand(`${dockerCmd} down`, 'Stopping PostgreSQL container');
  console.log('✅ Database stopped');
}

async function resetDatabase() {
  console.log('🔄 Resetting local PostgreSQL database...');
  
  if (!checkDockerCompose()) {
    process.exit(1);
  }

  const dockerCmd = getDockerComposeCommand();
  
  // Stop and remove containers and volumes
  runCommand(`${dockerCmd} down -v`, 'Removing containers and volumes');
  
  // Start fresh
  await startDatabase();
  console.log('✅ Database reset complete');
}

async function showStatus() {
  console.log('📊 Local Database Status:');
  
  try {
    const output = execSync('docker ps --filter name=track_postgres_dev --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
    if (output.includes('track_postgres_dev')) {
      console.log('✅ Database is running');
      console.log(output);
      console.log(`\n🔗 Connection URL: ${LOCAL_POSTGRES_URL}`);
    } else {
      console.log('❌ Database is not running');
      console.log('💡 Run "npm run db:start" to start the database');
    }
  } catch (error) {
    console.log('❌ Docker is not running or database container not found');
  }
}

async function showLogs() {
  console.log('📜 Database Logs:');
  try {
    execSync('docker logs track_postgres_dev --tail 50', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to get logs. Is the database running?');
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'start':
    await startDatabase();
    break;
  case 'stop':
    await stopDatabase();
    break;
  case 'reset':
    await resetDatabase();
    break;
  case 'status':
    await showStatus();
    break;
  case 'logs':
    await showLogs();
    break;
  default:
    console.log('🗄️  Local Database Manager');
    console.log('\nUsage: npm run db:<command>');
    console.log('\nCommands:');
    console.log('  start  - Start the local PostgreSQL database');
    console.log('  stop   - Stop the local PostgreSQL database');
    console.log('  reset  - Reset the database (removes all data)');
    console.log('  status - Show database status');
    console.log('  logs   - Show database logs');
    console.log('\nExamples:');
    console.log('  npm run db:start');
    console.log('  npm run db:status');
    console.log('  npm run db:stop');
}
