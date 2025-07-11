#!/bin/bash

# Integration Test Runner for Email-to-Threads App
# This script sets up the environment and runs comprehensive integration tests

set -e  # Exit on any error

echo "🚀 Email-to-Threads Integration Test Runner"
echo "=========================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Load environment variables from .env.local if it exists
if [ -f ".env.local" ]; then
    echo "ℹ️  Loading environment variables from .env.local"
    export $(grep -v '^#' .env.local | xargs)
fi

# Check for required environment variables
REQUIRED_VARS=("POSTGRES_URL" "SENDGRID_API_KEY" "SENDER_EMAIL" "OPENAI_API_KEY" "ENCRYPTION_KEY")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '   %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these variables in .env.local or your environment"
    exit 1
fi

# Set test environment
export NODE_ENV=test
export TEST_BASE_URL=${TEST_BASE_URL:-"https://track-set4.vercel.app"}

echo "ℹ️  Test Configuration:"
echo "   Base URL: $TEST_BASE_URL"
echo "   Node Environment: $NODE_ENV"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Add node-fetch if not present (needed for tests)
if ! npm list node-fetch > /dev/null 2>&1; then
    echo "📦 Installing test dependencies..."
    npm install node-fetch --save-dev
fi

# Create tests directory if it doesn't exist
mkdir -p tests

# Run the integration tests
echo "🧪 Running integration tests..."
echo ""

TEST_FAILED=0

# Run main integration tests
if ! node tests/integration-test.js; then
    TEST_FAILED=1
fi

# Run Gmail-specific tests if ENCRYPTION_KEY is set
if [ ! -z "$ENCRYPTION_KEY" ]; then
    echo ""
    echo "🧪 Running Gmail integration tests..."
    
    # Run encryption tests
    if ! node tests/test-encryption.js; then
        TEST_FAILED=1
    fi
    
    # Run Gmail integration tests
    if ! node tests/gmail-integration.test.js; then
        TEST_FAILED=1
    fi
else
    echo ""
    echo "⚠️  Skipping Gmail tests (ENCRYPTION_KEY not set)"
fi

if [ $TEST_FAILED -eq 0 ]; then
    echo ""
    echo "✅ All integration tests completed successfully!"
    echo "🎉 Your email-to-threads app is working correctly!"
else
    echo ""
    echo "❌ Integration tests failed!"
    echo "Check the output above for details on what went wrong."
    exit 1
fi

echo ""
echo "📋 Test Summary:"
echo "   - Email webhook processing ✅"
echo "   - Decision extraction ✅" 
echo "   - Database operations ✅"
echo "   - Confirmation flow ✅"
echo "   - Query functionality ✅"
echo "   - Duplicate handling ✅"
echo "   - API endpoints ✅"
if [ ! -z "$ENCRYPTION_KEY" ]; then
    echo "   - Gmail encryption ✅"
    echo "   - Gmail API endpoints ✅"
    echo "   - Gmail database schema ✅"
fi
echo ""
echo "🚀 Ready for production use!"
